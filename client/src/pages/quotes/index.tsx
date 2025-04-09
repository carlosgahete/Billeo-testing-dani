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
  FileClock,
  ChevronLeft,
  Plus,
  ArrowUpRight,
  Banknote,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
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
  const [location, navigate] = useLocation();

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
  
  // Calcular total de presupuestos en valor con validación menos estricta
  const totalValue = quotes.reduce((acc: number, q: Quote) => {
    // Validar y convertir q.total a un número
    let total = 0;
    
    try {
      // Si es un string, intentar parsearlo
      if (typeof q.total === 'string') {
        total = parseFloat(q.total);
      } 
      // Si ya es un número, usarlo directamente
      else if (typeof q.total === 'number') {
        total = q.total;
      }
      
      // Verificar si después de la conversión sigue siendo un número válido
      if (isNaN(total)) {
        console.warn(`Valor total no válido en presupuesto ${q.quoteNumber}: ${q.total}`);
        total = 0;
      }
      
    } catch (error) {
      console.error("Error al procesar total:", error);
      total = 0;
    }
    
    return acc + total;
  }, 0);
  
  // Debug para ver el total calculado
  console.log('Valor total de presupuestos calculado:', totalValue);
  
  const acceptedValue = quotes.filter(q => q.status === "accepted")
    .reduce((acc: number, q: Quote) => {
      // Validar y convertir q.total a un número
      let total = 0;
      
      try {
        // Si es un string, intentar parsearlo
        if (typeof q.total === 'string') {
          total = parseFloat(q.total);
        } 
        // Si ya es un número, usarlo directamente
        else if (typeof q.total === 'number') {
          total = q.total;
        }
        
        // Verificar si después de la conversión sigue siendo un número válido
        if (isNaN(total)) {
          console.warn(`Valor total no válido en presupuesto aceptado ${q.quoteNumber}: ${q.total}`);
          total = 0;
        }
        
      } catch (error) {
        console.error("Error al procesar total de presupuesto aceptado:", error);
        total = 0;
      }
      
      return acc + total;
    }, 0);
  
  // Tasa de conversión (% de presupuestos aceptados)
  const conversionRate = totalQuotes > 0 
    ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) 
    : "0.0";
  
  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      useGrouping: true
    }).format(amount);
  };

  return (
    <Layout>
      {/* Cabecera estilo Apple alineada con menú hamburguesa */}
      <div className="section-header fade-in mb-3 -mt-3 pt-0 flex items-center">
        <div className="flex items-center ml-8 md:ml-4">
          <div className="bg-[#FFF8E7] p-3 rounded-full mr-3 -mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
          </div>
          <div className="-mt-2">
            <h2 className="text-xl font-semibold text-gray-800 tracking-tight leading-none mb-0.5">Presupuestos</h2>
            <p className="text-sm text-gray-500 mt-0 leading-tight">Gestiona tus propuestas comerciales</p>
          </div>
        </div>
      </div>

      {/* Dashboard de presupuestos con estilo Apple */}
      <div className="mb-8 fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Tarjeta 1: Resumen de presupuestos - Estilo Apple */}
          <div className="dashboard-card fade-in scale-in">
            <div className="p-6">
              <div className="flex items-center mb-5">
                <div className="bg-[#F0F1FF] p-3 rounded-full mr-3">
                  <FileText className="h-5 w-5 text-[#5856D6]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-0 leading-tight">Resumen</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Estado de presupuestos</p>
                </div>
              </div>
              
              <div className="mb-5">
                <div className="text-3xl font-medium text-[#5856D6] pt-3">
                  {totalQuotes}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Presupuestos totales
                </div>
              </div>
              
              <div className="space-y-2 p-4 bg-[#F8F8FC] rounded-xl border border-[#EEEEFF]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <span className="w-2.5 h-2.5 bg-gray-300 rounded-full mr-2"></span>
                    Borradores
                  </span>
                  <span className="font-medium text-gray-800">{draftQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <span className="w-2.5 h-2.5 bg-blue-400 rounded-full mr-2"></span>
                    Enviados
                  </span>
                  <span className="font-medium text-gray-800">{sentQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <span className="w-2.5 h-2.5 bg-green-400 rounded-full mr-2"></span>
                    Aceptados
                  </span>
                  <span className="font-medium text-gray-800">{acceptedQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <span className="w-2.5 h-2.5 bg-red-400 rounded-full mr-2"></span>
                    Rechazados
                  </span>
                  <span className="font-medium text-gray-800">{rejectedQuotes}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tarjeta 2: Valor económico - Estilo Apple */}
          <div className="dashboard-card fade-in scale-in">
            <div className="p-6">
              <div className="flex items-center mb-5">
                <div className="bg-[#E8F5EE] p-3 rounded-full mr-3">
                  <Banknote className="h-5 w-5 text-[#34C759]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-0 leading-tight">Valor económico</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Importe total presupuestado</p>
                </div>
              </div>
              
              <div className="mb-5">
                <div className="text-3xl font-medium text-[#34C759] pt-3">
                  {formatCurrency(totalValue)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Valor total de presupuestos
                </div>
              </div>
              
              <div className="space-y-3 p-4 bg-[#F7FFF9] rounded-xl border border-[#E3FFE9] mb-14">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Presupuestos aceptados:</span>
                  <span className="font-medium text-gray-800">{formatCurrency(acceptedValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pendientes de aceptar:</span>
                  <span className="font-medium text-gray-800">{formatCurrency(totalValue - acceptedValue)}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  className="h-10 rounded-full bg-[#34C759] text-white flex items-center justify-center font-medium px-4 w-full hover:bg-[#2baa4e] transition-colors"
                  onClick={() => navigate("/quotes/create")}
                >
                  <FilePlus className="h-4 w-4 mr-2" />
                  Crear nuevo presupuesto
                </button>
              </div>
            </div>
          </div>
          
          {/* Tarjeta 3: Tasa de conversión - Estilo Apple */}
          <div className="dashboard-card fade-in scale-in">
            <div className="p-6">
              <div className="flex items-center mb-5">
                <div className="bg-[#EEF6FF] p-3 rounded-full mr-3">
                  <BarChart3 className="h-5 w-5 text-[#007AFF]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-0 leading-tight">Tasa de conversión</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Efectividad de presupuestos</p>
                </div>
              </div>
              
              <div className="mb-5">
                <div className="text-3xl font-medium text-[#007AFF] pt-3">
                  {conversionRate}%
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Tasa de aceptación
                </div>
              </div>
              
              <div className="space-y-3 p-4 bg-[#F5F9FF] rounded-xl border border-[#E0EDFF] mb-14">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Presupuestos enviados:</span>
                  <span className="font-medium text-gray-800">{sentQuotes + acceptedQuotes + rejectedQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Presupuestos aceptados:</span>
                  <span className="font-medium text-gray-800">{acceptedQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Clientes activos:</span>
                  <span className="font-medium text-gray-800">{clients.length}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  className="h-10 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-medium px-4 w-full hover:bg-[#0062cc] transition-colors"
                  onClick={() => {
                    // Aquí se podría implementar un filtro para ver solo los aceptados
                  }}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Ver aceptados
                </button>
              </div>
            </div>
          </div>
          
          {/* Tarjeta 4: Presupuestos pendientes - Estilo Apple */}
          <div className="dashboard-card fade-in scale-in">
            <div className="p-6">
              <div className="flex items-center mb-5">
                <div className="bg-[#FFF8E7] p-3 rounded-full mr-3">
                  <FileClock className="h-5 w-5 text-[#FF9500]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-0 leading-tight">Pendientes</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Requieren seguimiento</p>
                </div>
              </div>
              
              <div className="mb-5">
                <div className="text-3xl font-medium text-[#FF9500] pt-3">
                  {draftQuotes + sentQuotes}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Presupuestos pendientes
                </div>
              </div>
              
              <div className="space-y-3 p-4 bg-[#FFFBF0] rounded-xl border border-[#FFEECA] mb-14">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <span className="w-2.5 h-2.5 bg-neutral-300 rounded-full mr-2"></span>
                    Por enviar
                  </span>
                  <span className="font-medium text-gray-800">{draftQuotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <span className="w-2.5 h-2.5 bg-blue-400 rounded-full mr-2"></span>
                    Esperando respuesta
                  </span>
                  <span className="font-medium text-gray-800">{sentQuotes}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  className="h-10 rounded-full bg-[#FF9500] text-white flex items-center justify-center font-medium px-4 w-full hover:bg-[#cc7800] transition-colors"
                  onClick={() => {
                    // Aquí se podría implementar un filtro para ver solo los pendientes
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Ver pendientes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de presupuestos - Estilo Apple */}
      <div className="mt-8 fade-in">
        <div className="glass-panel rounded-3xl border border-gray-200/50 scale-in mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-[#F3F3F3] p-2.5 rounded-full mr-3">
                  <FileText className="h-5 w-5 text-[#5856D6]" />
                </div>
                <h3 className="text-lg font-medium text-gray-800">Listado de presupuestos</h3>
              </div>
            </div>
            
            <QuoteList userId={user.id} showActions={true} />
          </div>
        </div>
      </div>
    </Layout>
  );
}