import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices/index";
import CreateInvoicePage from "@/pages/invoices/create";
import InvoiceDetailPage from "@/pages/invoices/[id]";
import TransactionsPage from "@/pages/transactions/index";
import CreateTransactionPage from "@/pages/transactions/create";
import ReportsPage from "@/pages/reports/index";
import CompanyPage from "@/pages/company/index";
import SettingsPage from "@/pages/settings";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/invoices" component={InvoicesPage} />
        <Route path="/invoices/create" component={CreateInvoicePage} />
        <Route path="/invoices/:id" component={InvoiceDetailPage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/transactions/create" component={CreateTransactionPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/company" component={CompanyPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
