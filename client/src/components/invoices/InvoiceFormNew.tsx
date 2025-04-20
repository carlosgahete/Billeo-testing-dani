import React, { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { calculateInvoice } from './invoiceEngine'
import { Plus, Minus, X, ArrowRight, Euro, CalendarDays, FileText, Receipt, CreditCard, BanknoteIcon, Trash2 } from 'lucide-react'

interface InvoiceFormProps {
  form: UseFormReturn<any>;
  onCalculate?: () => void;
}

// Componente para manejar la línea de artículos en una factura (estilo Apple)
const ItemRow = ({ 
  index, 
  register, 
  remove, 
  canRemove,
  setValue,
  getValues,
  calculateTotals
}: { 
  index: number, 
  register: any, 
  remove: (index: number) => void, 
  canRemove: boolean,
  setValue: any,
  getValues: any,
  calculateTotals: () => void
}) => {
  // Prevenir envío del formulario al presionar Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };
  
  // Actualizar cálculos cuando cambian los valores
  const handleChange = () => {
    calculateTotals();
  };
  
  return (
    <div className="group relative mb-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          <input
            {...register(`items.${index}.name`)}
            placeholder="Descripción del servicio o producto"
            className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="col-span-3">
          <div className="flex items-center bg-gray-50 rounded-lg overflow-hidden">
            <input
              {...register(`items.${index}.quantity`)}
              type="number"
              placeholder="Cantidad"
              className="w-full px-3 py-2.5 bg-transparent border-0 focus:ring-2 focus:ring-blue-100 transition-colors"
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                handleChange();
                const value = parseFloat(e.target.value) || 0;
                setTimeout(() => {
                  setValue(`items.${index}.quantity`, value);
                  calculateTotals();
                }, 0);
              }}
            />
          </div>
        </div>
        <div className="col-span-3">
          <div className="flex items-center bg-gray-50 rounded-lg overflow-hidden">
            <span className="pl-3 text-gray-500">€</span>
            <input
              {...register(`items.${index}.price`)}
              type="number"
              placeholder="Precio"
              className="w-full px-2 py-2.5 bg-transparent border-0 focus:ring-2 focus:ring-blue-100 transition-colors"
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                handleChange();
                const value = parseFloat(e.target.value) || 0;
                setTimeout(() => {
                  setValue(`items.${index}.price`, value);
                  calculateTotals();
                }, 0);
              }}
            />
          </div>
        </div>
      </div>
      
      {canRemove && (
        <button
          type="button"
          onClick={() => remove(index)}
          className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Eliminar ítem"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

// Componente para manejar impuestos adicionales (estilo Apple)
const TaxRow = ({ 
  index, 
  register, 
  remove, 
  setValue, 
  getValues, 
  calculateTotals 
}: { 
  index: number, 
  register: any, 
  remove: (index: number) => void,
  setValue?: any, 
  getValues?: any, 
  calculateTotals?: () => void
}) => {
  // Prevenir envío del formulario al presionar Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };
  
  // Actualizar cálculos cuando cambian los valores
  const handleChange = () => {
    if (calculateTotals) {
      calculateTotals();
    }
  };
  
  return (
    <div className="group relative mb-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <input
            {...register(`additionalTaxes.${index}.name`)}
            placeholder="Nombre del impuesto (ej. IVA, IRPF)"
            className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
            onKeyDown={handleKeyDown}
            onChange={handleChange}
          />
        </div>
        <div className="col-span-4">
          <div className="flex items-center bg-gray-50 rounded-lg overflow-hidden">
            <input
              {...register(`additionalTaxes.${index}.rate`)}
              type="number"
              placeholder="Porcentaje"
              className="w-full px-3 py-2.5 bg-transparent border-0 focus:ring-2 focus:ring-blue-100 transition-colors"
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                handleChange();
                const value = parseFloat(e.target.value) || 0;
                setTimeout(() => {
                  setValue(`additionalTaxes.${index}.rate`, value);
                  if (calculateTotals) calculateTotals();
                }, 0);
              }}
            />
            <span className="pr-3 text-gray-500">%</span>
          </div>
        </div>
      </div>
      
      <button
        type="button"
        onClick={() => remove(index)}
        className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Eliminar impuesto"
      >
        <X size={16} />
      </button>
    </div>
  )
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ form, onCalculate }) => {
  const { register, watch, setValue, getValues } = form
  const items = watch('items') || []
  const additionalTaxes = watch('additionalTaxes') || []
  const subtotal = watch('subtotal') || 0
  const taxes = watch('taxes') || 0
  const total = watch('total') || 0
  
  // Estado para el acordeón
  const [activeSection, setActiveSection] = useState<string>("customer");
  
  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? "" : section);
  };

  // Función para calcular totales de la factura
  const calculateTotals = () => {
    try {
      // Si se proporciona una función externa para cálculos, usarla
      if (onCalculate) {
        onCalculate();
      } else {
        // Calcular localmente como fallback
        const data = getValues();
        const calculated = calculateInvoice(data);
        
        // Actualizar los valores calculados
        setValue('subtotal', calculated.subtotal, { shouldDirty: true });
        setValue('taxes', calculated.taxes, { shouldDirty: true });
        setValue('total', calculated.total, { shouldDirty: true });
      }
    } catch (error) {
      console.error("Error al calcular totales:", error);
    }
  };

  // Función para añadir un nuevo artículo
  const addItem = () => {
    const currentItems = [...items]
    setValue('items', [...currentItems, { name: '', quantity: 1, price: 0 }])
    // Calcular totales inmediatamente
    setTimeout(calculateTotals, 0);
  }

  // Función para eliminar un artículo
  const removeItem = (index: number) => {
    const currentItems = [...items]
    if (currentItems.length > 1) {
      setValue('items', currentItems.filter((_, i) => i !== index))
      // Calcular totales inmediatamente
      setTimeout(calculateTotals, 0);
    }
  }

  // Función para añadir un impuesto adicional
  const addTax = () => {
    const currentTaxes = [...additionalTaxes]
    setValue('additionalTaxes', [...currentTaxes, { name: 'IVA', rate: 21 }])
    // Calcular totales inmediatamente
    setTimeout(calculateTotals, 0);
  }

  // Función para eliminar un impuesto
  const removeTax = (index: number) => {
    const currentTaxes = [...additionalTaxes]
    setValue('additionalTaxes', currentTaxes.filter((_, i) => i !== index))
    // Calcular totales inmediatamente
    setTimeout(calculateTotals, 0);
  }

  return (
    <div className="space-y-6">
      {/* Sección de detalles del cliente */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div 
          className="bg-gradient-to-r from-gray-50 to-white p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection("customer")}
        >
          <h2 className="text-lg font-medium flex items-center text-gray-900">
            <FileText className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} /> 
            Datos del cliente
          </h2>
          <div className={`transform transition-transform ${activeSection === "customer" ? "rotate-90" : ""}`}>
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </div>
        </div>
        
        {activeSection === "customer" && (
          <div className="p-5 bg-white border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre/Razón social</label>
                <input
                  {...register('customerName')}
                  className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                  placeholder="Empresa o particular"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">NIF/CIF</label>
                <input
                  {...register('customerNif')}
                  className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                  placeholder="Ej: B12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  {...register('customerEmail')}
                  type="email"
                  className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                  placeholder="cliente@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
                <input
                  {...register('customerAddress')}
                  className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                  placeholder="Calle, Nº, Ciudad, CP"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección de fechas */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div 
          className="bg-gradient-to-r from-gray-50 to-white p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection("dates")}
        >
          <h2 className="text-lg font-medium flex items-center text-gray-900">
            <CalendarDays className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} /> 
            Fechas
          </h2>
          <div className={`transform transition-transform ${activeSection === "dates" ? "rotate-90" : ""}`}>
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </div>
        </div>
        
        {activeSection === "dates" && (
          <div className="p-5 bg-white border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de emisión</label>
                <input
                  {...register('issueDate')}
                  type="date"
                  className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de vencimiento</label>
                <input
                  {...register('dueDate')}
                  type="date"
                  className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección de artículos */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div 
          className="bg-gradient-to-r from-gray-50 to-white p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection("items")}
        >
          <h2 className="text-lg font-medium flex items-center text-gray-900">
            <Receipt className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} /> 
            Artículos y servicios
          </h2>
          <div className={`transform transition-transform ${activeSection === "items" ? "rotate-90" : ""}`}>
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </div>
        </div>
        
        {activeSection === "items" && (
          <div className="p-5 bg-white border-t border-gray-100">
            <div className="grid grid-cols-12 gap-4 mb-4 text-sm font-medium text-gray-600 px-4">
              <div className="col-span-6">Descripción</div>
              <div className="col-span-3">Cantidad</div>
              <div className="col-span-3">Precio</div>
            </div>
            
            {items.map((_, index: number) => (
              <ItemRow
                key={index}
                index={index}
                register={register}
                remove={removeItem}
                canRemove={items.length > 1}
                setValue={setValue}
                getValues={getValues}
                calculateTotals={calculateTotals}
              />
            ))}
            
            <div className="mt-4">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center justify-center w-full p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Añadir artículo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sección de impuestos */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div 
          className="bg-gradient-to-r from-gray-50 to-white p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection("taxes")}
        >
          <h2 className="text-lg font-medium flex items-center text-gray-900">
            <Euro className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} /> 
            Impuestos
          </h2>
          <div className={`transform transition-transform ${activeSection === "taxes" ? "rotate-90" : ""}`}>
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </div>
        </div>
        
        {activeSection === "taxes" && (
          <div className="p-5 bg-white border-t border-gray-100">
            {additionalTaxes.length > 0 ? (
              <>
                <div className="grid grid-cols-12 gap-4 mb-4 text-sm font-medium text-gray-600 px-4">
                  <div className="col-span-8">Nombre del impuesto</div>
                  <div className="col-span-4">Porcentaje</div>
                </div>
                
                {additionalTaxes.map((_, index) => (
                  <TaxRow
                    key={index}
                    index={index}
                    register={register}
                    remove={removeTax}
                    setValue={setValue}
                    getValues={getValues}
                    calculateTotals={calculateTotals}
                  />
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 rounded-lg mb-4">
                <p className="text-gray-500 text-center mb-4">
                  No se aplicará ningún impuesto por defecto. Añade los impuestos que necesites.
                </p>
              </div>
            )}
            
            <div className="mt-4">
              <button
                type="button"
                onClick={addTax}
                className="flex items-center justify-center w-full p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Añadir impuesto
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sección de totales */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div className="p-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-600">Subtotal:</div>
            <div className="text-right font-medium">{subtotal.toFixed(2)} €</div>
            
            {/* Desglose de impuestos por nombre - solo si hay impuestos definidos */}
            {additionalTaxes.length > 0 && (
              <>
                {additionalTaxes.map((tax, index) => (
                  <React.Fragment key={index}>
                    <div className="text-gray-500 text-sm">
                      {tax.name || 'Impuesto'} ({tax.rate}%):
                    </div>
                    <div className="text-right text-gray-500 text-sm">
                      {((subtotal * tax.rate) / 100).toFixed(2)} €
                    </div>
                  </React.Fragment>
                ))}
                
                <div className="text-gray-600">Total impuestos:</div>
                <div className="text-right font-medium">{taxes.toFixed(2)} €</div>
              </>
            )}
            
            <div className="text-lg font-bold text-gray-800 pt-2 border-t">
              Total:
            </div>
            <div className="text-lg font-bold text-right text-gray-800 pt-2 border-t">
              {total.toFixed(2)} €
            </div>
          </div>
        </div>
      </div>
      
      {/* Sección de información adicional */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div 
          className="bg-gradient-to-r from-gray-50 to-white p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection("additional")}
        >
          <h2 className="text-lg font-medium flex items-center text-gray-900">
            <CreditCard className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} /> 
            Información de pago
          </h2>
          <div className={`transform transition-transform ${activeSection === "additional" ? "rotate-90" : ""}`}>
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </div>
        </div>
        
        {activeSection === "additional" && (
          <div className="p-5 bg-white border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado de la factura</label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                >
                  <option value="pending">🕙 Pendiente de pago</option>
                  <option value="paid">✅ Pagada</option>
                  <option value="overdue">⚠️ Vencida</option>
                  <option value="canceled">❌ Cancelada</option>
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Si seleccionas "Pagada", se creará automáticamente una transacción de ingreso.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Método de pago</label>
                <select
                  {...register('paymentMethod')}
                  className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                >
                  <option value="">Seleccionar método de pago</option>
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta de crédito/débito</option>
                  <option value="bizum">Bizum</option>
                </select>
              </div>
            </div>
            
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cuenta bancaria</label>
              <div className="flex items-center bg-gray-50 rounded-lg overflow-hidden">
                <BanknoteIcon className="ml-3 w-5 h-5 text-gray-400" />
                <input
                  {...register('bankAccount')}
                  className="w-full px-3 py-2.5 bg-transparent border-0 focus:ring-2 focus:ring-blue-100 transition-colors"
                  placeholder="ES12 3456 7890 1234 5678 9012"
                />
              </div>
            </div>
            
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas adicionales</label>
              <textarea
                {...register('notes')}
                className="w-full px-3 py-2.5 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors resize-none"
                rows={4}
                placeholder="Condiciones de pago, notas importantes, etc."
              />
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('createTransaction')}
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 font-medium text-gray-700">Registrar automáticamente como ingreso al guardar</span>
              </label>
              <p className="text-sm text-gray-500 mt-2">
                Si marcas esta opción, se creará automáticamente una transacción de ingreso
                cuando guardes la factura. Esto te ahorrará el paso de registrar el ingreso manualmente.
                <br/>
                <span className="italic">Nota: Si marcas la factura como "Pagada", se creará una transacción automáticamente incluso si no activas esta opción.</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InvoiceForm