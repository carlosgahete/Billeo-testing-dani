import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { QuoteList } from "@/components/quotes/QuoteList";
import { MobileQuoteButtons } from "@/components/quotes/MobileQuoteButtons";
import { PageTitle } from "@/components/ui/page-title";
import Layout from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
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
  BarChart3,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [filter, setFilter] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Efecto para refrescar la lista cuando cambia el filtro
  useEffect(() => {
    console.log("Filtro aplicado:", filter);
    console.log("Es móvil:", isMobile);
  }, [filter, isMobile]);

  // Obtener estadísticas de presupuestos
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });
  
  // Efecto para limpiar el filtro al cargar la página
  useEffect(() => {
    return () => setFilter(null);
  }, []);

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
  
  // Función para generar y descargar el PDF de resumen
  const generateQuotesSummaryPDF = () => {
    // Crear nuevo documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Añadir título y fecha
    const today = new Date();
    const formattedDate = today.toLocaleDateString('es-ES', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    // Configurar fuentes y estilos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(88, 86, 214); // Color morado principal
    doc.text("Resumen de Presupuestos", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado el ${formattedDate}`, 105, 28, { align: "center" });
    
    // Línea separadora
    doc.setDrawColor(200, 200, 220);
    doc.line(20, 35, 190, 35);
    
    // Sección 1: Resumen de estadísticas generales
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Estadísticas Generales", 20, 45);
    
    // Tabla simple para estadísticas generales
    let yPos = 55; // Posición inicial Y
    const indent = 20; // Indentación izquierda
    const colWidth = 70; // Ancho de columna para etiquetas
    
    // Función para añadir una fila a la tabla
    const addTableRow = (label: string, value: string) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(label, indent, yPos);
      
      doc.setFont("helvetica", "bold");
      doc.text(value, indent + colWidth, yPos);
      
      yPos += 8; // Espacio entre filas
    };
    
    // Añadir las estadísticas como tabla simple
    addTableRow("Total de presupuestos:", totalQuotes.toString());
    addTableRow("Presupuestos en borrador:", draftQuotes.toString());
    addTableRow("Presupuestos enviados:", sentQuotes.toString());
    addTableRow("Presupuestos aceptados:", acceptedQuotes.toString());
    addTableRow("Presupuestos rechazados:", rejectedQuotes.toString());
    addTableRow("Tasa de conversión:", `${conversionRate}%`);
    addTableRow("Valor total:", formatCurrency(totalValue));
    addTableRow("Valor presupuestos aceptados:", formatCurrency(acceptedValue));
    addTableRow("Pendientes por aceptar:", formatCurrency(totalValue - acceptedValue));
    
    // Añadir espacio después de la tabla
    yPos += 10;
    
    // Sección 2: Distribución de presupuestos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Distribución de Presupuestos", 20, yPos);
    yPos += 10;
    
    // Crear una tabla simple para la distribución
    const totalForPercentage = totalQuotes > 0 ? totalQuotes : 1;
    const draftPercentage = ((draftQuotes / totalForPercentage) * 100).toFixed(1);
    const sentPercentage = ((sentQuotes / totalForPercentage) * 100).toFixed(1);
    const acceptedPercentage = ((acceptedQuotes / totalForPercentage) * 100).toFixed(1);
    const rejectedPercentage = ((rejectedQuotes / totalForPercentage) * 100).toFixed(1);
    
    // Encabezados de la tabla
    doc.setFillColor(0, 122, 255);
    doc.setTextColor(255, 255, 255);
    doc.rect(20, yPos, 50, 8, "F");
    doc.rect(70, yPos, 40, 8, "F");
    doc.rect(110, yPos, 40, 8, "F");
    doc.text("Estado", 23, yPos + 5.5);
    doc.text("Cantidad", 73, yPos + 5.5);
    doc.text("Porcentaje", 113, yPos + 5.5);
    yPos += 8;
    
    // Función para añadir fila a la tabla de distribución
    const addDistributionRow = (status: string, count: number, percentage: string, bgColor: number) => {
      // Fondo alternado para mejorar la legibilidad
      doc.setFillColor(bgColor, bgColor, bgColor);
      doc.rect(20, yPos, 50, 8, "F");
      doc.rect(70, yPos, 40, 8, "F");
      doc.rect(110, yPos, 40, 8, "F");
      
      // Texto
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      doc.text(status, 23, yPos + 5.5);
      doc.text(count.toString(), 73, yPos + 5.5);
      doc.text(`${percentage}%`, 113, yPos + 5.5);
      
      yPos += 8;
    };
    
    // Filas de la tabla con colores alternados
    addDistributionRow("Borradores", draftQuotes, draftPercentage, 245);
    addDistributionRow("Enviados", sentQuotes, sentPercentage, 240);
    addDistributionRow("Aceptados", acceptedQuotes, acceptedPercentage, 245);
    addDistributionRow("Rechazados", rejectedQuotes, rejectedPercentage, 240);
    
    // Añadir espacio después de la tabla
    yPos += 10;
    
    // Sección 3: Tasa de conversión con barra de progreso
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text("Tasa de Conversión", 20, yPos);
    yPos += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Porcentaje de presupuestos aceptados sobre el total:", 20, yPos);
    yPos += 8;
    
    // Barra de progreso
    const barWidth = 150;
    const barHeight = 10;
    const barX = 20;
    
    // Fondo de la barra
    doc.setFillColor(240, 240, 240);
    doc.rect(barX, yPos, barWidth, barHeight, "F");
    
    // Progreso de la barra
    const conversionRateNum = parseFloat(conversionRate);
    const progressWidth = (conversionRateNum / 100) * barWidth;
    doc.setFillColor(52, 199, 89); // Verde para la tasa de conversión
    doc.rect(barX, yPos, progressWidth, barHeight, "F");
    
    // Valor de la tasa
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${conversionRate}%`, barX + barWidth + 5, yPos + 7);
    
    // Pie de página con información adicional
    const bottomY = 270;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("Este informe muestra un resumen de los presupuestos generados en la plataforma.", 105, bottomY, {align: "center"});
    doc.text("Para más detalles, consulte la sección de presupuestos en la aplicación.", 105, bottomY + 5, {align: "center"});
    
    // Añadir fecha y hora de generación en el pie de página
    const timestamp = today.toLocaleTimeString('es-ES');
    doc.text(`${formattedDate} - ${timestamp}`, 105, bottomY + 12, {align: "center"});
    
    // Guardar el PDF
    doc.save("resumen_presupuestos.pdf");
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
            <div className="p-6 flex flex-col h-[430px]">
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
              
              <div className="mt-auto">
                <button
                  className="h-10 rounded-full bg-[#5856D6] text-white flex items-center justify-center font-medium px-4 w-full hover:bg-[#4645ab] transition-colors"
                  onClick={generateQuotesSummaryPDF}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar resumen
                </button>
              </div>
            </div>
          </div>
          
          {/* Tarjeta 2: Valor económico - Estilo Apple */}
          <div className="dashboard-card fade-in scale-in">
            <div className="p-6 flex flex-col h-[430px]">
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
              
              <div className="space-y-3 p-4 bg-[#F7FFF9] rounded-xl border border-[#E3FFE9]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Presupuestos aceptados:</span>
                  <span className="font-medium text-gray-800">{formatCurrency(acceptedValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pendientes de aceptar:</span>
                  <span className="font-medium text-gray-800">{formatCurrency(totalValue - acceptedValue)}</span>
                </div>
              </div>
              
              <div className="mt-auto">
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
            <div className="p-6 flex flex-col h-[430px]">
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
              
              <div className="space-y-3 p-4 bg-[#F5F9FF] rounded-xl border border-[#E0EDFF]">
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
              
              <div className="mt-auto">
                <button
                  className="h-10 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-medium px-4 w-full hover:bg-[#0062cc] transition-colors"
                  onClick={() => {
                    const newFilter = filter === "accepted" ? null : "accepted";
                    setFilter(newFilter);
                  }}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {filter === "accepted" ? "Ver todos" : "Ver aceptados"}
                </button>
              </div>
            </div>
          </div>
          
          {/* Tarjeta 4: Presupuestos pendientes - Estilo Apple */}
          <div className="dashboard-card fade-in scale-in">
            <div className="p-6 flex flex-col h-[430px]">
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
              
              <div className="space-y-3 p-4 bg-[#FFFBF0] rounded-xl border border-[#FFEECA]">
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
              
              <div className="mt-auto">
                <button
                  className="h-10 rounded-full bg-[#FF9500] text-white flex items-center justify-center font-medium px-4 w-full hover:bg-[#cc7800] transition-colors"
                  onClick={() => {
                    const newFilter = filter === "pending" ? null : "pending";
                    setFilter(newFilter);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {filter === "pending" ? "Ver todos" : "Ver pendientes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Los botones de acción para móvil ahora están en el componente MobileQuoteButtons */}

      {/* Importamos y usamos los botones para móvil */}
      {isMobile && <MobileQuoteButtons onGeneratePDF={generateQuotesSummaryPDF} />}

      {/* Lista de presupuestos - Estilo Apple */}
      <div className="mt-4 fade-in">
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
            
            {/* Filtramos las citas según el filtro seleccionado */}
            <QuoteList userId={user.id} showActions={true} filter={filter} />
          </div>
        </div>
      </div>
    </Layout>
  );
}