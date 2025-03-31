// Interfaces relacionadas con PDFs para facturas

// Definición de interfaces
interface Client {
  id: number;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
}

interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
}

interface AdditionalTax {
  name: string;
  amount: number;
  isPercentage?: boolean;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes?: string;
  additionalTaxes?: AdditionalTax[] | null;
}

interface CompanyInfo {
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  logo?: string;
}

// Función para generar un PDF en base64
export async function generateInvoicePDFBase64(
  invoice: Invoice,
  client: Client,
  items: InvoiceItem[],
  companyInfo: CompanyInfo
): Promise<string> {
  return ""; // Esta función será implementada en el cliente
}

// Reutilizaremos la función generateInvoicePDF del cliente
// Este servicio se usará principalmente para la integración con el servicio de email