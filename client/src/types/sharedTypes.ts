// Define los tipos compartidos entre componentes
export interface Transaction {
  id: number;
  title?: string;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  categoryId: number | null;
  paymentMethod: string;
  notes?: string;
  attachments?: string[];
  tax?: number | string;
  additionalTaxes?: string;
}

export interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string;
}