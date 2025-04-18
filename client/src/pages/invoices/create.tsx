// client/src/pages/invoices/create.tsx

import { useForm } from 'react-hook-form'
import InvoiceFormNew from '@/components/invoices/InvoiceFormNew'
import { useLocation } from 'wouter'
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { calculateInvoice } from '@/components/invoices/invoiceEngine'
import { useEffect } from 'react'

export default function CreateInvoicePage() {
  const [, navigate] = useLocation();

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
    },
  })

  const { watch, handleSubmit, setValue } = form

  const watchedValues = watch()

  // Calcular subtotal, impuestos y total cada vez que cambian los valores clave
  useEffect(() => {
    try {
      const updated = calculateInvoice(watchedValues)
      // Usar la versión no tipada de setValue para evitar errores de TypeScript
      const setValueAny = setValue as any
      setValueAny('subtotal', updated.subtotal)
      setValueAny('taxes', updated.taxes)
      setValueAny('total', updated.total)
    } catch (error) {
      console.error("Error al calcular totales:", error)
    }
  }, [
    watchedValues.items,
    watchedValues.additionalTaxes,
    setValue,
  ])

  // Crear una mutación para enviar la factura al servidor
  const invoiceMutation = useMutation({
    mutationFn: async (formData: any) => {
      return await apiRequest("POST", "/api/invoices", formData);
    },
    onSuccess: () => {
      // Navegar a la lista de facturas después de crear exitosamente
      navigate("/invoices");
    },
    onError: (error) => {
      console.error("Error al crear la factura:", error);
      alert("Ocurrió un error al crear la factura: " + error.message);
    }
  });

  const onSubmit = async (data: any) => {
    // Transformar los datos al formato que espera el servidor
    const invoice = {
      invoiceNumber: `TEMP-${new Date().getTime()}`, // Número temporal, el servidor lo asignará correctamente
      clientId: 1, // ID del cliente por defecto para pruebas
      issueDate: data.issueDate,
      dueDate: data.dueDate || data.issueDate,
      subtotal: data.subtotal,
      tax: data.taxes,
      total: data.total,
      additionalTaxes: data.additionalTaxes,
      status: "pending",
      notes: `${data.customerName} - ${data.customerNif}\n${data.customerEmail || ''}\n${data.customerAddress || ''}\n\nMétodo de pago: ${data.paymentMethod || 'No especificado'}\nCuenta: ${data.bankAccount || 'No especificada'}\n\n${data.notes || ''}`,
    };
    
    // Transformar los items
    const items = data.items.map((item: any) => ({
      description: item.name,
      quantity: parseFloat(item.quantity),
      unitPrice: parseFloat(item.price),
      taxRate: 21, // IVA por defecto
      subtotal: parseFloat(item.quantity) * parseFloat(item.price)
    }));
    
    console.log("Enviando datos:", { invoice, items });
    
    // Enviar los datos transformados en el formato que espera el servidor
    invoiceMutation.mutate({ invoice, items });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Crear Factura</h1>
        <button
          type="button"
          onClick={() => navigate("/invoices")}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Volver
        </button>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <InvoiceFormNew form={form} />
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="bg-[#329FAD] hover:bg-[#2b8b96] text-white px-6 py-2 rounded-md"
          >
            Guardar factura
          </button>
        </div>
      </form>
    </div>
  )
}
