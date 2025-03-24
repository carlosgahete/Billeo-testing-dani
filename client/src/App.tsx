import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices/index";
import CreateInvoicePage from "@/pages/invoices/create";
import InvoiceDetailPage from "@/pages/invoices/[id]";
import TransactionsPage from "@/pages/transactions/index";
import CreateTransactionPage from "@/pages/transactions/create";
import ReportsPage from "@/pages/reports/index";
import CompanyPage from "@/pages/company/index";
import SettingsPage from "@/pages/settings";
import AuthGuard from "@/components/auth/AuthGuard";

// Protected route component - improved with better route handling
const ProtectedRoute = ({ component: Component, ...rest }: { component: React.ComponentType<any>, path?: string }) => {
  return (
    <AuthGuard>
      <Component {...rest} />
    </AuthGuard>
  );
};

function Router() {
  const [location] = useLocation();
  const isLoginPage = location === "/login";

  // If we're on the login page, don't wrap with Layout
  if (isLoginPage) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route>
          <AuthGuard>
            <NotFound />
          </AuthGuard>
        </Route>
      </Switch>
    );
  }

  // For all other routes, wrap with Layout and AuthGuard
  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/invoices" component={() => <ProtectedRoute component={InvoicesPage} />} />
        <Route path="/invoices/create" component={() => <ProtectedRoute component={CreateInvoicePage} />} />
        <Route path="/invoices/:id" component={(params) => <ProtectedRoute component={InvoiceDetailPage} {...params} />} />
        <Route path="/transactions" component={() => <ProtectedRoute component={TransactionsPage} />} />
        <Route path="/transactions/create" component={() => <ProtectedRoute component={CreateTransactionPage} />} />
        <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
        <Route path="/company" component={() => <ProtectedRoute component={CompanyPage} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
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
