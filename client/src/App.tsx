import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import AuthPage from "@/pages/auth-page"; // Esta página la mantenemos sin lazy loading
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";

// Por problemas de compatibilidad con tipos, volvemos a los import normales
// La optimización la haremos a nivel de API y de caché
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices/index";
import CreateInvoicePage from "@/pages/invoices/create";
import InvoiceDetailPage from "@/pages/invoices/[id]";
import QuotesPage from "@/pages/quotes/index";
import CreateQuotePage from "@/pages/quotes/create";
import EditQuotePage from "@/pages/quotes/edit/[id]";
import QuoteDetailPage from "@/pages/quotes/[id]";
import TransactionsPage from "@/pages/transactions/index";
import CreateTransactionPage from "@/pages/transactions/create";
import DocumentScanPage from "@/pages/document-scan";
import ReportsPage from "@/pages/reports/index";
import CompanyPage from "@/pages/company/index";
import SettingsPage from "@/pages/settings";
import IncomeExpensePage from "@/pages/income-expense";
import UsersManagementPage from "@/pages/admin/users-management";

// Componente de carga optimizado
const LoadingIndicator = () => (
  <div className="flex items-center justify-center h-[calc(100vh-80px)]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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
      <Route path="/quotes">
        <Layout>
          <ProtectedRoute path="/quotes" component={QuotesPage} />
        </Layout>
      </Route>
      <Route path="/quotes/create">
        <Layout>
          <ProtectedRoute path="/quotes/create" component={CreateQuotePage} />
        </Layout>
      </Route>
      <Route path="/quotes/edit/:id">
        {(params) => (
          <Layout>
            <ProtectedRoute path={`/quotes/edit/${params.id}`} component={EditQuotePage} />
          </Layout>
        )}
      </Route>
      <Route path="/quotes/:id">
        {(params) => (
          <Layout>
            <ProtectedRoute path={`/quotes/${params.id}`} component={QuoteDetailPage} />
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
      <Route path="/admin/users">
        <Layout>
          <ProtectedRoute path="/admin/users" component={UsersManagementPage} />
        </Layout>
      </Route>
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
