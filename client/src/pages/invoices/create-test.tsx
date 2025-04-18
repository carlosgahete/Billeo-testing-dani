// client/src/pages/invoices/create-test.tsx
import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { calculateInvoice } from "@/utils/invoiceEngine";
import InvoiceForm from "@/components/invoices/InvoiceForm";

export default function CreateInvoiceTestPage() {
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
    },
  });

  const { watch } = form;

  // Recalcular cuando cambien ítems o impuestos
  React.useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (name?.startsWith("items") || name === "additionalTaxes") {
        calculateInvoice(form);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  return (
    <FormProvider {...form}>
      <div style={{ padding: 32 }}>
        <h1>🧾 Crear factura de prueba (completa)</h1>

        {/* Datos generales */}
        <div>
          <label>Fecha de emisión</label>
          <input type="date" {...form.register("issueDate")} />
        </div>

        <div>
          <label>Fecha de vencimiento</label>
          <input type="date" {...form.register("dueDate")} />
        </div>

        {/* Cliente */}
        <div>
          <label>Nombre o razón social del cliente</label>
          <input {...form.register("clientName", { required: true })} />
        </div>

        <div>
          <label>NIF/CIF</label>
          <input {...form.register("clientNif", { required: true })} />
        </div>

        <div>
          <label>Email del cliente</label>
          <input type="email" {...form.register("clientEmail")} />
        </div>

        <div>
          <label>Dirección del cliente</label>
          <input {...form.register("clientAddress")} />
        </div>

        {/* Método de pago */}
        <div>
          <label>Método de pago</label>
          <select {...form.register("paymentMethod")}>
            <option value="">Selecciona uno</option>
            <option value="transferencia">Transferencia</option>
            <option value="bizum">Bizum</option>
            <option value="efectivo">Efectivo</option>
          </select>
        </div>

        <div>
          <label>Número de cuenta bancaria</label>
          <input {...form.register("bankAccount")} />
        </div>

        <div>
          <label>Notas / condiciones adicionales</label>
          <textarea {...form.register("notes")} />
        </div>

        {/* Aquí el formulario real de ítems, impuestos, totales, etc */}
        <InvoiceForm form={form} />
      </div>
    </FormProvider>
  );
}