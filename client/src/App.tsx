import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices/index";
import CreateInvoicePage from "@/pages/invoices/create";
import InvoiceDetailPage from "@/pages/invoices/[id]";
import TransactionsPage from "@/pages/transactions/index";
import CreateTransactionPage from "@/pages/transactions/create";
import DocumentScanPage from "@/pages/document-scan";
import ReportsPage from "@/pages/reports/index";
import CompanyPage from "@/pages/company/index";
import SettingsPage from "@/pages/settings";
import IncomeExpensePage from "@/pages/income-expense";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <Layout>
          <ProtectedRoute path="/" component={Dashboard} />
        </Layout>
      </Route>
      <Route path="/invoices">
        <Layout>
          <ProtectedRoute path="/invoices" component={InvoicesPage} />
        </Layout>
      </Route>
      <Route path="/invoices/create">
        <Layout>
          <ProtectedRoute path="/invoices/create" component={CreateInvoicePage} />
        </Layout>
      </Route>
      <Route path="/invoices/:id">
        {(params) => (
          <Layout>
            <ProtectedRoute path={`/invoices/${params.id}`} component={InvoiceDetailPage} />
          </Layout>
        )}
      </Route>
      <Route path="/transactions">
        <Layout>
          <ProtectedRoute path="/transactions" component={TransactionsPage} />
        </Layout>
      </Route>
      <Route path="/transactions/create">
        <Layout>
          <ProtectedRoute path="/transactions/create" component={CreateTransactionPage} />
        </Layout>
      </Route>
      <Route path="/documents/scan">
        <Layout>
          <ProtectedRoute path="/documents/scan" component={DocumentScanPage} />
        </Layout>
      </Route>
      <Route path="/reports">
        <Layout>
          <ProtectedRoute path="/reports" component={ReportsPage} />
        </Layout>
      </Route>
      <Route path="/company">
        <Layout>
          <ProtectedRoute path="/company" component={CompanyPage} />
        </Layout>
      </Route>
      <Route path="/settings">
        <Layout>
          <ProtectedRoute path="/settings" component={SettingsPage} />
        </Layout>
      </Route>
      <Route path="/income-expense">
        <Layout>
          <ProtectedRoute path="/income-expense" component={IncomeExpensePage} />
        </Layout>
      </Route>
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
