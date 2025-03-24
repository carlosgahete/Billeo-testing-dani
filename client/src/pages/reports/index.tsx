import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import ReportGenerator from "@/components/reports/ReportGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ReportsPage = () => {
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });

  if (authLoading || statsLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="md:ml-16">
        <h1 className="text-2xl font-bold text-neutral-800">Informes</h1>
        <p className="text-neutral-500">
          Analiza tus ingresos, gastos e impuestos para tomar mejores decisiones financieras
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">
              Resumen fiscal (Trimestre actual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">IVA repercutido:</span>
                <span className="font-medium">
                  {dashboardStats && formatCurrency(dashboardStats.taxes.vat)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">IRPF estimado:</span>
                <span className="font-medium">
                  {dashboardStats && formatCurrency(dashboardStats.taxes.incomeTax)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">
              Balance actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ingresos:</span>
                <span className="font-medium text-secondary-600">
                  {dashboardStats && formatCurrency(dashboardStats.income)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gastos:</span>
                <span className="font-medium text-danger-500">
                  {dashboardStats && formatCurrency(dashboardStats.expenses)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Resultado:</span>
                <span className={`font-medium ${dashboardStats?.balance >= 0 ? "text-secondary-600" : "text-danger-500"}`}>
                  {dashboardStats && formatCurrency(dashboardStats.balance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">
              Facturas pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Importe pendiente:</span>
                <span className="font-medium text-warning-700">
                  {dashboardStats && formatCurrency(dashboardStats.pendingInvoices)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Número de facturas:</span>
                <span className="font-medium">
                  {dashboardStats?.pendingCount || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <ReportGenerator />
    </div>
  );
};

export default ReportsPage;
