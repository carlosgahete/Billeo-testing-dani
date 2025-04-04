export interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  
  // Para el componente QuotesSummary
  quotesTotal: number;
  quotesAccepted: number;
  quotesRejected: number;
  quotesPending: number;
  
  // Para el componente InvoicesSummary
  invoicesTotal: number;
  invoicesPending: number;
  invoicesPaid: number;
  invoicesOverdue: number;
  
  // Para cualquier otra información adicional
  [key: string]: any;
}

export interface DashboardPreferences {
  layout: {
    blocks: string[];
    positions: { [key: string]: { x: number; y: number; w: number; h: number } };
  };
}