import React from 'react'
import { UseFormReturn } from 'react-hook-form'

interface InvoiceFormProps {
  form: UseFormReturn<any>
}

// Componente simple para manejar la línea de artículos en una factura
const ItemRow = ({ 
  index, 
  register, 
  remove, 
  canRemove 
}: { 
  index: number, 
  register: any, 
  remove: (index: number) => void, 
  canRemove: boolean 
}) => {
  // Prevenir envío del formulario al presionar Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };
  
  return (
    <div className="grid grid-cols-12 gap-2 mb-2">
      <div className="col-span-6">
        <input
          {...register(`items.${index}.name`)}
          placeholder="Descripción"
          className="w-full p-2 border rounded"
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="col-span-2">
        <input
          {...register(`items.${index}.quantity`)}
          type="number"
          placeholder="Cantidad"
          className="w-full p-2 border rounded"
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="col-span-2">
        <input
          {...register(`items.${index}.price`)}
          type="number"
          placeholder="Precio"
          className="w-full p-2 border rounded"
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="col-span-2 flex items-center">
        {canRemove && (
          <button
            type="button"
            onClick={() => remove(index)}
            className="p-1 text-red-500 hover:text-red-700"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}

// Componente para manejar impuestos adicionales
const TaxRow = ({ 
  index, 
  register, 
  remove 
}: { 
  index: number, 
  register: any, 
  remove: (index: number) => void 
}) => {
  // Prevenir envío del formulario al presionar Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };
  
  return (
    <div className="grid grid-cols-12 gap-2 mb-2">
      <div className="col-span-6">
        <input
          {...register(`additionalTaxes.${index}.name`)}
          placeholder="Nombre del impuesto"
          className="w-full p-2 border rounded"
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="col-span-4">
        <input
          {...register(`additionalTaxes.${index}.rate`)}
          type="number"
          placeholder="Tasa (%)"
          className="w-full p-2 border rounded"
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="col-span-2 flex items-center">
        <button
          type="button"
          onClick={() => remove(index)}
          className="p-1 text-red-500 hover:text-red-700"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ form }) => {
  const { register, watch, setValue } = form
  const items = watch('items') || []
  const additionalTaxes = watch('additionalTaxes') || []
  const subtotal = watch('subtotal') || 0
  const taxes = watch('taxes') || 0
  const total = watch('total') || 0

  // Función para añadir un nuevo artículo
  const addItem = () => {
    const currentItems = [...items]
    setValue('items', [...currentItems, { name: '', quantity: 1, price: 0 }])
  }

  // Función para eliminar un artículo
  const removeItem = (index: number) => {
    const currentItems = [...items]
    if (currentItems.length > 1) {
      setValue('items', currentItems.filter((_, i) => i !== index))
    }
  }

  // Función para añadir un impuesto adicional
  const addTax = () => {
    const currentTaxes = [...additionalTaxes]
    const defaultRate = watch('defaultTaxRate') || '21'
    setValue('additionalTaxes', [...currentTaxes, { name: 'IVA', rate: defaultRate }])
  }

  // Función para eliminar un impuesto
  const removeTax = (index: number) => {
    const currentTaxes = [...additionalTaxes]
    setValue('additionalTaxes', currentTaxes.filter((_, i) => i !== index))
  }

  return (
    <div>
      {/* Sección de detalles del cliente */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Datos del cliente</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Nombre/Razón social</label>
            <input
              {...register('customerName')}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">NIF/CIF</label>
            <input
              {...register('customerNif')}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Email</label>
            <input
              {...register('customerEmail')}
              type="email"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Dirección</label>
            <input
              {...register('customerAddress')}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Sección de fechas e IVA por defecto */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Fechas y configuración básica</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block mb-1">Fecha de emisión</label>
            <input
              {...register('issueDate')}
              type="date"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Fecha de vencimiento</label>
            <input
              {...register('dueDate')}
              type="date"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">IVA por defecto (%)</label>
            <select
              {...register('defaultTaxRate')}
              className="w-full p-2 border rounded"
              onChange={(e) => {
                // Si no hay impuestos adicionales, aplicar este como IVA por defecto
                const value = e.target.value;
                if (additionalTaxes.length === 0) {
                  // Añadir un impuesto por defecto si no hay ninguno
                  setValue('additionalTaxes', [{ 
                    name: 'IVA', 
                    rate: value || '21'
                  }]);
                }
              }}
            >
              <option value="21">21% (General)</option>
              <option value="10">10% (Reducido)</option>
              <option value="4">4% (Superreducido)</option>
              <option value="0">0% (Exento)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sección de artículos */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Artículos/Servicios</h2>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Añadir artículo
          </button>
        </div>
        
        <div className="grid grid-cols-12 gap-2 mb-2 font-semibold">
          <div className="col-span-6">Descripción</div>
          <div className="col-span-2">Cantidad</div>
          <div className="col-span-2">Precio</div>
          <div className="col-span-2"></div>
        </div>
        
        {items.map((_, index) => (
          <ItemRow
            key={index}
            index={index}
            register={register}
            remove={removeItem}
            canRemove={items.length > 1}
          />
        ))}
      </div>

      {/* Sección de impuestos adicionales */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Impuestos</h2>
          <button
            type="button"
            onClick={addTax}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Añadir impuesto
          </button>
        </div>
        
        {additionalTaxes.length > 0 && (
          <div className="grid grid-cols-12 gap-2 mb-2 font-semibold">
            <div className="col-span-6">Nombre</div>
            <div className="col-span-4">Tasa (%)</div>
            <div className="col-span-2"></div>
          </div>
        )}
        
        {additionalTaxes.map((_, index) => (
          <TaxRow
            key={index}
            index={index}
            register={register}
            remove={removeTax}
          />
        ))}

        {additionalTaxes.length === 0 && (
          <p className="text-gray-500 italic">
            Se aplicará IVA del {watch('defaultTaxRate') || 21}% por defecto
          </p>
        )}
      </div>

      {/* Sección de totales */}
      <div className="mb-6 border-t pt-4">
        <div className="flex justify-between mb-1">
          <span>Subtotal:</span>
          <span>{subtotal.toFixed(2)} €</span>
        </div>
        
        {/* Desglose de impuestos por nombre */}
        {additionalTaxes.length > 0 ? (
          <>
            {additionalTaxes.map((tax, index) => (
              <div key={index} className="flex justify-between mb-1 text-sm text-gray-600">
                <span>{tax.name || 'Impuesto'} ({tax.rate}%):</span>
                <span>{((subtotal * Number(tax.rate)) / 100).toFixed(2)} €</span>
              </div>
            ))}
          </>
        ) : (
          <div className="flex justify-between mb-1 text-sm text-gray-600">
            <span>IVA ({watch('defaultTaxRate') || 21}%):</span>
            <span>{(subtotal * (Number(watch('defaultTaxRate')) || 21) / 100).toFixed(2)} €</span>
          </div>
        )}
        
        <div className="flex justify-between mb-1">
          <span>Total impuestos:</span>
          <span>{taxes.toFixed(2)} €</span>
        </div>
        
        <div className="flex justify-between text-lg font-bold mt-2">
          <span>Total:</span>
          <span>{total.toFixed(2)} €</span>
        </div>
      </div>

      {/* Sección de notas */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Información adicional</h2>
        <div>
          <label className="block mb-1">Método de pago</label>
          <select
            {...register('paymentMethod')}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="">Seleccionar método de pago</option>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta de crédito/débito</option>
            <option value="bizum">Bizum</option>
          </select>
        </div>
        
        <div>
          <label className="block mb-1">Cuenta bancaria</label>
          <input
            {...register('bankAccount')}
            className="w-full p-2 border rounded mb-4"
            placeholder="ES12 3456 7890 1234 5678 9012"
          />
        </div>
        
        <div>
          <label className="block mb-1">Notas adicionales</label>
          <textarea
            {...register('notes')}
            className="w-full p-2 border rounded h-24"
            placeholder="Condiciones de pago, notas importantes, etc."
          />
        </div>
      </div>
    </div>
  )
}

export default InvoiceForm