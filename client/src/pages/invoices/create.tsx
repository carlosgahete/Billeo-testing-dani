// client/src/pages/invoices/create.tsx
import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { calculateInvoice } from "@/components/invoices/invoiceEngine";
import InvoiceItemsForm from "@/components/invoices/InvoiceItemsForm";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function CreateInvoicePage() {
  const [, navigate] = useLocation();
  
  const form = useForm({
    defaultValues: {
      issueDate: new Date().toISOString().substring(0, 10),
      dueDate: "",
      clientName: "",
      clientNif: "",
      clientEmail: "",
      clientAddress: "",
      paymentMethod: "",
      bankAccount: "",
      notes: "",
      items: [{ name: "", quantity: 1, price: 0 }],
      additionalTaxes: [],
      subtotal: 0,
      taxTotal: 0,
      total: 0
    },
  });

  const { watch, handleSubmit } = form;

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

  // Observar cambios en los campos para actualizar cálculos
  React.useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (name?.startsWith("items") || name === "additionalTaxes") {
        calculateInvoice(form);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, form]);

  // Manejar el envío del formulario
  const onSubmit = (data: any) => {
    // Transformar los datos al formato que espera el servidor
    const invoiceData = {
      invoiceNumber: `TEMP-${new Date().getTime()}`, // Número temporal, el servidor lo asignará correctamente
      clientId: 1, // ID del cliente por defecto para pruebas - normalmente se obtendría de un valor seleccionado
      issueDate: data.issueDate,
      dueDate: data.dueDate || data.issueDate, // Si no hay fecha de vencimiento, usar la fecha de emisión
      subtotal: data.subtotal,
      tax: data.taxTotal,
      total: data.total,
      additionalTaxes: data.additionalTaxes,
      status: "pending",
      notes: `${data.clientName} - ${data.clientNif}\n${data.clientEmail || ''}\n${data.clientAddress || ''}\n\nMétodo de pago: ${data.paymentMethod || 'No especificado'}\nCuenta: ${data.bankAccount || 'No especificada'}\n\n${data.notes || ''}`,
      // Convertir los ítems al formato que espera el servidor
      items: data.items.map((item: any) => ({
        description: item.name,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.price),
        taxRate: 21, // IVA por defecto
        subtotal: parseFloat(item.quantity) * parseFloat(item.price)
      }))
    };
    
    // Enviar los datos transformados
    invoiceMutation.mutate(invoiceData);
  };

  return (
    <FormProvider {...form}>
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0 }}>🧾 Crear factura</h1>
          <button 
            type="button" 
            onClick={() => navigate("/invoices")}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f1f1f1',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Volver
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 5 }}>Fecha de emisión</label>
              <input 
                type="date" 
                {...form.register("issueDate")} 
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 5 }}>Fecha de vencimiento</label>
              <input 
                type="date" 
                {...form.register("dueDate")} 
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h2>📋 Datos del cliente</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5 }}>Nombre o razón social</label>
                <input 
                  {...form.register("clientName", { required: true })} 
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
                {form.formState.errors.clientName && (
                  <span style={{ color: 'red', fontSize: '0.8em' }}>Campo requerido</span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 5 }}>NIF/CIF</label>
                <input 
                  {...form.register("clientNif", { required: true })} 
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
                {form.formState.errors.clientNif && (
                  <span style={{ color: 'red', fontSize: '0.8em' }}>Campo requerido</span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 5 }}>Email</label>
                <input 
                  type="email" 
                  {...form.register("clientEmail")} 
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 5 }}>Dirección</label>
                <input 
                  {...form.register("clientAddress")} 
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h2>💸 Datos de pago</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5 }}>Método de pago</label>
                <select 
                  {...form.register("paymentMethod")} 
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                >
                  <option value="">Selecciona uno</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="bizum">Bizum</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 5 }}>Número de cuenta bancaria</label>
                <input 
                  {...form.register("bankAccount")} 
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 5 }}>Notas / condiciones adicionales</label>
            <textarea 
              {...form.register("notes")} 
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', minHeight: 100 }}
            />
          </div>

          <InvoiceItemsForm />
        </form>
      </div>
    </FormProvider>
  );
}
