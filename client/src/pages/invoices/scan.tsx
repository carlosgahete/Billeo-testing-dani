import InvoiceScanner from "@/components/invoices/InvoiceScanner";
import { useEffect } from "react";

const InvoiceScanPage = () => {
  useEffect(() => {
    // Actualizar el título de la página
    document.title = "Escanear Factura | Billeo";
  }, []);
  
  return <InvoiceScanner />;
};

export default InvoiceScanPage;