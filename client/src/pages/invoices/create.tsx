// client/src/pages/invoices/create.tsx

import { useForm } from 'react-hook-form'
import InvoiceFormNew from '@/components/invoices/InvoiceFormNew'
import { useLocation } from 'wouter'
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { calculateInvoice } from '@/components/invoices/invoiceEngine'
import { useEffect, useRef, useState } from 'react'
import { FileText, ChevronLeft, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function CreateInvoicePage() {
  const [, navigate] = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const queryClient = useQueryClient();

  // Definir el tipo de datos del formulario
  type InvoiceFormValues = {
    customerName: string;
    customerNif: string;
    customerEmail: string;
    customerAddress: string;
    issueDate: string;
    dueDate: string;
    items: { name: string; quantity: number; price: number; }[];
    additionalTaxes: { name: string; rate: number; }[];
    notes: string;
    paymentMethod: string;
    bankAccount: string;
    subtotal?: number;
    taxes?: number;
    total?: number;
    status: string;
    createTransaction: boolean;
  }

  const form = useForm<InvoiceFormValues>({
    defaultValues: {
      customerName: '',
      customerNif: '',
      customerEmail: '',
      customerAddress: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      items: [{ name: '', quantity: 1, price: 0 }],
      additionalTaxes: [],
      notes: '',
      paymentMethod: '',
      bankAccount: '',
      subtotal: 0,
      taxes: 0,
      total: 0,
      status: 'pending',
      createTransaction: false, // Por defecto no crear transacción
    },
  })

  const { watch, handleSubmit, setValue, getValues } = form

  const watchedValues = watch()
  
  // Referencia para mantener una versión previa de los valores de items
  const prevItemsRef = useRef<string>("");
  const prevTaxesRef = useRef<string>("");
  
  // Función para actualizar cálculos que se puede llamar directamente desde componentes hijos
  const updateCalculations = () => {
    try {
      const formData = getValues();
      const updated = calculateInvoice(formData);
      setValue('subtotal', updated.subtotal, { shouldDirty: true });
      setValue('taxes', updated.taxes, { shouldDirty: true });
      setValue('total', updated.total, { shouldDirty: true });
      
      console.log("Cálculos actualizados:", updated);
    } catch (error) {
      console.error("Error al calcular totales:", error);
    }
  };

  // Calcular subtotal, impuestos y total cada vez que cambian los valores clave
  useEffect(() => {
    try {
      const itemsJson = JSON.stringify(watchedValues.items || []);
      const taxesJson = JSON.stringify(watchedValues.additionalTaxes || []);
      
      // Solo actualizar si realmente cambiaron los valores
      if (itemsJson !== prevItemsRef.current || taxesJson !== prevTaxesRef.current) {
        // Guardar valores actuales para la próxima comparación
        prevItemsRef.current = itemsJson;
        prevTaxesRef.current = taxesJson;
        
        updateCalculations();
      }
    } catch (error) {
      console.error("Error al calcular totales:", error);
    }
  }, [
    watchedValues.items, 
    watchedValues.additionalTaxes,
    setValue,
    getValues
  ])

  // Crear una mutación para enviar la factura al servidor
  const invoiceMutation = useMutation({
    mutationFn: async (formData: any) => {
      try {
        const response = await apiRequest("POST", "/api/invoices", formData);
        return response;
      } catch (error: any) {
        // Manejar errores de validación del servidor
        if (error.data && error.data.errors) {
          // Formatear los mensajes de error para una mejor legibilidad
          const errorMessages = error.data.errors.map((err: any) => {
            return `- ${err.path.join('.')}: ${err.message}`;
          }).join('\n');
          
          throw new Error(`Errores de validación:\n${errorMessages}`);
        }
        
        // Reenviar el error original si no es un error de validación
        throw error;
      }
    },
    onSuccess: (data: any) => {
      // Personalizar el mensaje de éxito según si se creó una transacción o no
      let message = "Factura creada correctamente";
      
      // Si el servidor nos dice que se creó una transacción automáticamente
      if (data && data.transaction) {
        message += "\nSe ha creado automáticamente una transacción de ingreso por " + 
          (typeof data.transaction.amount === 'string' ? data.transaction.amount : data.transaction.amount.toFixed(2)) + 
          "€";
      }
      // Si la factura se marcó como pagada pero no hay transacción
      else if (data && data.invoice && data.invoice.status === 'paid') {
        message += "\nLa factura ha sido marcada como pagada";
      }
      
      // Mostrar mensaje de éxito usando el estado
      setSuccessMessage(message);
      setShowSuccess(true);
      
      // Invalidación agresiva del caché para asegurar que todas las vistas se actualicen correctamente
      // Primero, limpiamos cualquier caché existente para estos endpoints
      queryClient.removeQueries({ queryKey: ["/api/invoices"] });
      queryClient.removeQueries({ queryKey: ["/api/transactions"] });
      queryClient.removeQueries({ queryKey: ["/api/stats/dashboard"] });
      
      // Luego, forzamos una actualización fresca de los datos
      Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/invoices"] }),
        queryClient.refetchQueries({ queryKey: ["/api/transactions"] }),
        queryClient.refetchQueries({ queryKey: ["/api/stats/dashboard"] }),
        queryClient.refetchQueries({ queryKey: ["/api/dashboard-direct"] }),
      ]);
      
      // Emitir un evento personalizado para notificar a componentes que escuchan sobre la creación de una nueva factura
      window.dispatchEvent(new CustomEvent('invoice-created', { 
        detail: { invoiceId: data?.invoice?.id || data?.id || 'new' }
      }));
      
      // Navegar a la lista de facturas después de un breve retraso
      setTimeout(() => {
        navigate("/invoices");
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Error al crear la factura:", error);
      // Mostrar mensaje de error más detallado
      alert("Ocurrió un error al crear la factura:\n" + error.message);
    }
  });

  const onSubmit = async (data: any) => {
    // Transformar los datos al formato que espera el servidor y convertir números a strings
    const invoice: any = {
      invoiceNumber: `TEMP-${new Date().getTime()}`, // Número temporal, el servidor lo asignará correctamente
      clientId: 1, // ID del cliente por defecto para pruebas
      issueDate: data.issueDate,
      dueDate: data.dueDate || data.issueDate,
      subtotal: String(data.subtotal || 0), // Convertir a string para el servidor
      tax: String(data.taxes || 0), // Convertir a string para el servidor
      total: String(data.total || 0), // Convertir a string para el servidor
      status: data.status || "pending", // Usar el estado seleccionado o "pending" por defecto
      createTransaction: data.createTransaction || false, // Indicar si debe crear transacción
      notes: `${data.customerName} - ${data.customerNif}\n${data.customerEmail || ''}\n${data.customerAddress || ''}\n\nMétodo de pago: ${data.paymentMethod || 'No especificado'}\nCuenta: ${data.bankAccount || 'No especificada'}\n\n${data.notes || ''}`,
    };
    
    // Asegurarnos de que los additionalTaxes tienen la estructura correcta
    const additionalTaxes = data.additionalTaxes.map((tax: any) => ({
      name: tax.name || 'IVA',
      amount: String(((data.subtotal || 0) * (parseFloat(tax.rate) || 0) / 100).toFixed(2)), // Calcular y convertir a string
      rate: String(tax.rate || 0), // Convertir a string
    }));
    
    // Si hay impuestos, añadirlos al objeto de la factura
    if (additionalTaxes.length > 0) {
      invoice.additionalTaxes = additionalTaxes;
    }
    
    // Transformar los items
    const items = data.items.map((item: any) => ({
      description: item.name || 'Servicio',
      quantity: String(parseFloat(item.quantity) || 1), // Convertir a string
      unitPrice: String(parseFloat(item.price) || 0), // Convertir a string
      taxRate: "0", // Sin impuesto por defecto, solo se aplican los definidos explícitamente
      subtotal: String((parseFloat(item.quantity || 1) * parseFloat(item.price || 0)).toFixed(2)) // Convertir a string
    }));
    
    console.log("Enviando datos:", { invoice, items });
    
    // Enviar los datos transformados en el formato que espera el servidor
    invoiceMutation.mutate({ invoice, items });
  }

  return (
    <div className="relative max-w-5xl mx-auto px-4 py-6 bg-[#f5f7fb]">
      {/* Header con diseño estilo Apple */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="mr-4 p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Volver"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-medium text-gray-900 flex items-center">
            <FileText className="mr-3 h-6 w-6 text-blue-500" strokeWidth={1.5} />
            Nueva Factura
          </h1>
        </div>
        
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={invoiceMutation.isPending}
          className={`
            inline-flex items-center px-5 py-2.5 rounded-xl font-medium shadow-sm text-white
            ${invoiceMutation.isPending ? 
              'bg-blue-400 cursor-not-allowed' : 
              'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
            }
            transition-all duration-200 ease-in-out
          `}
        >
          {invoiceMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar factura
            </>
          )}
        </button>
      </div>
      
      {/* Notificación de éxito estilo Apple */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm border border-gray-100 px-4 py-3 rounded-xl shadow-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-gray-800">{successMessage}</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <InvoiceFormNew form={form} onCalculate={updateCalculations} />
        
        {/* Botón fijo inferior en móviles */}
        <div className="sticky bottom-0 left-0 right-0 mt-8 py-4 px-4 bg-white/90 backdrop-blur-sm rounded-t-xl shadow-[0_-1px_3px_rgba(0,0,0,0.1)] md:hidden">
          <button
            type="submit"
            disabled={invoiceMutation.isPending}
            className={`
              w-full inline-flex items-center justify-center px-5 py-3 rounded-xl font-medium text-white
              ${invoiceMutation.isPending ? 
                'bg-blue-400 cursor-not-allowed' : 
                'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
              }
              transition-all duration-200 ease-in-out
            `}
          >
            {invoiceMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar factura
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
