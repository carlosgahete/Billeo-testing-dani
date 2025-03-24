import { useQuery } from "@tanstack/react-query";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import TaxSummary from "@/components/dashboard/TaxSummary";
import TasksList from "@/components/dashboard/TasksList";
import QuickActions from "@/components/dashboard/QuickActions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { useLocation } from "wouter";

const Dashboard = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/session"],
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo cargar la sesión.",
        variant: "destructive",
      });
    },
  });

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>
            <p className="text-neutral-500">
              Bienvenido de nuevo, {user?.name || "usuario"}. Aquí tienes un resumen de tu actividad reciente.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Button 
              variant="outline" 
              className="bg-white text-neutral-700 border-neutral-300 shadow-sm hover:bg-neutral-50 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button 
              className="bg-primary-600 text-white shadow-sm hover:bg-primary-700 flex items-center" 
              onClick={() => navigate("/invoices/create")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva factura
            </Button>
          </div>
        </div>
      </div>

      <DashboardMetrics userId={user?.id} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <RecentInvoices />
          <RecentTransactions />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <TaxSummary />
          <TasksList />
          <QuickActions />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
