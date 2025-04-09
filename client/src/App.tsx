import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import AuthPage from "@/pages/auth-page"; // Esta página la mantenemos sin lazy loading
import { ProtectedRoute, ProtectedAdminRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";

// Por problemas de compatibilidad con tipos, volvemos a los import normales
// La optimización la haremos a nivel de API y de caché
import NotFound from "@/pages/not-found";
import FixedDashboard from "@/pages/fixed-dashboard";
// import AppleSimpleDashboardPage from "@/pages/apple-simple-dashboard"; // Eliminado
import CompleteDashboardPage from "@/pages/complete-dashboard";
import InvoicesPage from "@/pages/invoices/index";
import CreateInvoicePage from "@/pages/invoices/create";
import InvoiceDetailPage from "@/pages/invoices/[id]";
import EditInvoicePage from "@/pages/invoices/EditInvoicePage";
import QuotesPage from "@/pages/quotes/index";
import CreateQuotePage from "@/pages/quotes/create";
import EditQuotePage from "@/pages/quotes/edit/[id]";
import QuoteDetailPage from "@/pages/quotes/[id]";
import TransactionsPage from "@/pages/transactions/index";
import CreateTransactionPage from "@/pages/transactions/create";
import EditTransactionPage from "@/pages/transactions/edit/[id]";
import DocumentScanPage from "@/pages/document-scan";
import ReportsPage from "@/pages/reports/index";
import CompanyPage from "@/pages/company/index";
import SettingsPage from "@/pages/settings";
import CategoriesPage from "@/pages/settings/categories";
import IncomeExpensePage from "@/pages/income-expense";
import UsersManagementPage from "@/pages/admin/users-management";
import SelectUserPage from "@/pages/admin/select-user";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import ProfilePage from "@/pages/profile-page";
import TestFormat from "@/test-format";
import SimpleExpensePage from "@/pages/SimpleExpensePage";
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
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="/">
        <Layout>
          <ProtectedRoute path="/" component={CompleteDashboardPage} />
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
      <Route path="/invoices/edit/:id">
        {(params) => (
          <Layout>
            <ProtectedRoute path={`/invoices/edit/${params.id}`} component={EditInvoicePage} />
          </Layout>
        )}
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
      <Route path="/quotes/new/minimal">
        <Layout>
          <ProtectedRoute path="/quotes/new/minimal" component={CreateQuotePage} />
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
      <Route path="/transactions/new">
        <Layout>
          <ProtectedRoute path="/transactions/new" component={CreateTransactionPage} />
        </Layout>
      </Route>
      <Route path="/transactions/edit/:id">
        {(params) => (
          <Layout>
            <ProtectedRoute path={`/transactions/edit/${params.id}`} component={EditTransactionPage} />
          </Layout>
        )}
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
      <Route path="/settings/categories">
        <Layout>
          <ProtectedRoute path="/settings/categories" component={CategoriesPage} />
        </Layout>
      </Route>
      <Route path="/income-expense">
        <Layout>
          <ProtectedRoute path="/income-expense" component={IncomeExpensePage} />
        </Layout>
      </Route>

      <Route path="/document-scan">
        <Layout>
          <ProtectedRoute path="/document-scan" component={DocumentScanPage} />
        </Layout>
      </Route>
      {/* Ruta de dashboard completo */}
      <Route path="/complete-dashboard">
        <Layout>
          <ProtectedRoute path="/complete-dashboard" component={CompleteDashboardPage} />
        </Layout>
      </Route>
      <Route path="/admin/users">
        <Layout>
          <ProtectedAdminRoute path="/admin/users" component={UsersManagementPage} />
        </Layout>
      </Route>
      <Route path="/admin/select-user">
        <ProtectedAdminRoute path="/admin/select-user" component={SelectUserPage} />
      </Route>
      <Route path="/profile">
        <Layout>
          <ProtectedRoute path="/profile" component={ProfilePage} />
        </Layout>
      </Route>
      <Route path="/simple-expense">
        <Layout>
          <ProtectedRoute path="/simple-expense" component={SimpleExpensePage} />
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
