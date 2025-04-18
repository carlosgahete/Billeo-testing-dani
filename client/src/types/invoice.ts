export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal?: number;
}

export interface AdditionalTax {
  name: string;
  amount: number;
  rate?: number;
  isPercentage: boolean;
}

export interface InvoiceFormValues {
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  taxTotal?: number;
  total: number;
  additionalTaxes: AdditionalTax[];
  status: string;
  notes?: string;
  attachments?: string[];
  items: InvoiceItem[];
}