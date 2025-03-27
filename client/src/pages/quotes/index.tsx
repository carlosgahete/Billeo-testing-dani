import { useAuth } from "@/hooks/use-auth";
import { QuoteList } from "@/components/quotes/QuoteList";
import { PageTitle } from "@/components/ui/page-title";
import Layout from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  FileText, 
  FilePlus, 
  Send, 
  CheckSquare, 
  AlertCircle, 
  Loader2, 
  Info,
  PieChart,
  DollarSign,
  FileClock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Interfaces para los datos
interface Quote {
  id: number;
  quoteNumber: string;
  clientId: number;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
}

interface Client {
  id: number;
  name: string;
  taxId: string;
  // otros campos necesarios
}

export default function QuotesPage() {
  const { user } = useAuth();

  // Obtener estadísticas de presupuestos
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  // Obtener estadísticas de clientes
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const isLoading = quotesLoading || clientsLoading || !user;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }

  // Estadísticas sobre presupuestos
  const totalQuotes = quotes.length;
  const draftQuotes = quotes.filter(q => q.status === "draft").length;
  const sentQuotes = quotes.filter(q => q.status === "sent").length;
  const acceptedQuotes = quotes.filter(q => q.status === "accepted").length;
  const rejectedQuotes = quotes.filter(q => q.status === "rejected").length;
  
  // Calcular total de presupuestos en valor
  const totalValue = quotes.reduce((acc: number, q: Quote) => acc + q.total, 0);
  const acceptedValue = quotes.filter(q => q.status === "accepted")
    .reduce((acc: number, q: Quote) => acc + q.total, 0);
  
  // Tasa de conversión (% de presupuestos aceptados)
  const conversionRate = totalQuotes > 0 
    ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) 
    : "0.0";

  return (
    <Layout>
      <div className="mt-4">
        <PageTitle 
          title="Presupuestos" 
          description="Gestiona y envía presupuestos a clientes. Conviértelos en facturas con un clic." 
        />
      </div>

      {/* Dashboard de presupuestos */}
      <div className="mb-6 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Tarjeta 1: Resumen de presupuestos */}
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="bg-primary-50 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-primary-700 flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Resumen
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[200px] text-xs">Visión general de tus presupuestos en diferentes estados</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-3xl font-bold text-primary-600">{totalQuotes}</p>
              <p className="text-sm text-neutral-500 mb-3">Presupuestos totales</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-neutral-300 rounded-full mr-2"></span>
                    Borradores
                  </span>
                  <span className="font-medium">{draftQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
                    Enviados
                  </span>
                  <span className="font-medium">{sentQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                    Aceptados
                  </span>
                  <span className="font-medium">{acceptedQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-red-400 rounded-full mr-2"></span>
                    Rechazados
                  </span>
                  <span className="font-medium">{rejectedQuotes}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tarjeta 2: Valor económico */}
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="bg-green-50 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-green-700 flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Valor económico
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[200px] text-xs">Valor total de todos tus presupuestos</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-3xl font-bold text-green-600">{totalValue.toLocaleString('es-ES')} €</p>
              <p className="text-sm text-neutral-500 mb-3">Valor total presupuestado</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Presupuestos aceptados:</span>
                  <span className="font-medium">{acceptedValue.toLocaleString('es-ES')} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Pendientes de aceptar:</span>
                  <span className="font-medium">{(totalValue - acceptedValue).toLocaleString('es-ES')} €</span>
                </div>
              </div>
              
              <Link href="/quotes/create">
                <Button variant="default" size="sm" className="w-full mt-4">
                  <FilePlus className="h-4 w-4 mr-2" />
                  Crear nuevo presupuesto
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          {/* Tarjeta 3: Tasa de conversión */}
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="bg-blue-50 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-blue-700 flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Tasa de conversión
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[200px] text-xs">Porcentaje de presupuestos que han sido aceptados por tus clientes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-3xl font-bold text-blue-600">{conversionRate}%</p>
              <p className="text-sm text-neutral-500 mb-3">Tasa de aceptación</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Presupuestos enviados:</span>
                  <span className="font-medium">{sentQuotes + acceptedQuotes + rejectedQuotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Presupuestos aceptados:</span>
                  <span className="font-medium">{acceptedQuotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Clientes:</span>
                  <span className="font-medium">{clients.length}</span>
                </div>
              </div>
              
              <Button 
                variant="default" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => {
                  // Aquí se podría implementar un filtro para ver solo los aceptados
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Ver presupuestos aceptados
              </Button>
            </CardContent>
          </Card>
          
          {/* Tarjeta 4: Presupuestos pendientes */}
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="bg-amber-50 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-amber-700 flex items-center">
                  <FileClock className="mr-2 h-5 w-5" />
                  Pendientes
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[200px] text-xs">Presupuestos que necesitan seguimiento para convertirse en ventas</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-3xl font-bold text-amber-600">{draftQuotes + sentQuotes}</p>
              <p className="text-sm text-neutral-500 mb-3">Presupuestos pendientes</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-neutral-300 rounded-full mr-2"></span>
                    Por enviar
                  </span>
                  <span className="font-medium">{draftQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
                    Esperando respuesta
                  </span>
                  <span className="font-medium">{sentQuotes}</span>
                </div>
              </div>
              
              <Button 
                variant="default" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => {
                  // Aquí se podría implementar un filtro para ver solo los pendientes
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Gestionar pendientes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista de presupuestos */}
      <div className="mt-2">
        <QuoteList userId={user.id} showActions={true} />
      </div>
    </Layout>
  );
}