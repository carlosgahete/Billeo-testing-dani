import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

const Dashboard = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });

  const isLoading = userLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  // Datos de ejemplo basados en la imagen
  const financialData = {
    income: {
      total: 1317.00,
      iva: 276.57,
      irpf: 197.55,
      totalWithTaxes: 1396.02
    },
    expenses: {
      total: 503.02,
      iva: 47.33,
      irpf: 0.00,
      totalWithTaxes: 550.35
    },
    balance: {
      total: 813.98,
      iva: 229.24,
      totalWithTaxes: 845.67
    }
  };

  return (
    <div className="bg-neutral-100">
      {/* Encabezado */}
      <div className="bg-primary-600 text-white p-4 mb-4 -mx-4 -mt-4">
        <h1 className="text-xl font-bold text-center">Inicio</h1>
      </div>
      
      {/* Filtros */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="border-0 px-4 py-3 justify-between rounded-lg h-auto">
                <SelectValue placeholder="Año" />
                <ChevronDown className="h-4 w-4 opacity-70" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="border-0 px-4 py-3 justify-between rounded-lg h-auto">
                <SelectValue placeholder="Periodo" />
                <ChevronDown className="h-4 w-4 opacity-70" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el año</SelectItem>
                <SelectItem value="q1">1er trimestre</SelectItem>
                <SelectItem value="q2">2º trimestre</SelectItem>
                <SelectItem value="q3">3er trimestre</SelectItem>
                <SelectItem value="q4">4º trimestre</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
      
      {/* Tarjeta de Ingresos */}
      <Card className="mb-4 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-base text-neutral-500 mb-2">Ingresos</h2>
          <p className="text-4xl font-bold text-primary-600 mb-4">{financialData.income.total.toLocaleString('es-ES')} €</p>
          
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-neutral-500">IVA</p>
              <p className="font-semibold">{financialData.income.iva.toLocaleString('es-ES')} €</p>
            </div>
            <div>
              <p className="text-neutral-500">IRPF</p>
              <p className="font-semibold">{financialData.income.irpf.toLocaleString('es-ES')} €</p>
            </div>
            <div>
              <p className="text-neutral-500">TOTAL</p>
              <p className="font-semibold">{financialData.income.totalWithTaxes.toLocaleString('es-ES')} €</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tarjeta de Gastos */}
      <Card className="mb-4 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-base text-neutral-500 mb-2">Gastos</h2>
          <p className="text-4xl font-bold text-red-500 mb-4">{financialData.expenses.total.toLocaleString('es-ES')} €</p>
          
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-neutral-500">IVA</p>
              <p className="font-semibold">{financialData.expenses.iva.toLocaleString('es-ES')} €</p>
            </div>
            <div>
              <p className="text-neutral-500">IRPF</p>
              <p className="font-semibold">{financialData.expenses.irpf.toLocaleString('es-ES')} €</p>
            </div>
            <div>
              <p className="text-neutral-500">TOTAL</p>
              <p className="font-semibold">{financialData.expenses.totalWithTaxes.toLocaleString('es-ES')} €</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tarjeta de Resultado */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-base text-neutral-500 mb-2">Resultado</h2>
          <p className="text-4xl font-bold text-neutral-900 mb-4">{financialData.balance.total.toLocaleString('es-ES')} €</p>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-neutral-500">IVA</p>
              <p className="font-semibold">{financialData.balance.iva.toLocaleString('es-ES')} €</p>
            </div>
            <div>
              <p className="text-neutral-500">TOTAL</p>
              <p className="font-semibold">{financialData.balance.totalWithTaxes.toLocaleString('es-ES')} €</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
