import React from "react";
import { 
  BarChart3,
  Table,
  ListFilter,
  Text,
  Star,
  BarChart,
  FileText,
  Receipt,
  TrendingUp,
  DollarSign,
  CalendarRange,
  PieChart,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Filter
} from "lucide-react";
import ResultSummary from "@/components/dashboard/blocks/ResultSummary";
import QuotesSummary from "@/components/dashboard/blocks/QuotesSummary";
import InvoicesSummary from "@/components/dashboard/blocks/InvoicesSummary";
import ComparativeChart from "@/components/dashboard/blocks/ComparativeChart";
import ExpensesSummary from "@/components/dashboard/blocks/ExpensesSummary";
import TaxSummary from "@/components/dashboard/blocks/TaxSummary";
import ExpensesByCategory from "@/components/dashboard/blocks/ExpensesByCategory";

// Definición de los bloques disponibles para el dashboard
// Esto centraliza la configuración para que sea usada tanto por el diálogo
// de adición de bloques como por el dashboard personalizable
export const DASHBOARD_BLOCKS = {
  "result-summary": {
    id: "result-summary",
    title: "Resumen de Resultados",
    description: "Beneficio, IVA a liquidar e IRPF con métricas clave.",
    component: ResultSummary,
    icon: <BarChart3 className="h-8 w-8 text-green-500" />,
    type: "charts"
  },
  "quotes-summary": {
    id: "quotes-summary",
    title: "Presupuestos",
    description: "Aceptados, rechazados y pendientes con análisis de ratio.",
    component: QuotesSummary,
    icon: <FileText className="h-8 w-8 text-purple-500" />,
    type: "lists"
  },
  "invoices-summary": {
    id: "invoices-summary",
    title: "Facturas",
    description: "Estado de facturas emitidas y cantidades pendientes de cobro.",
    component: InvoicesSummary,
    icon: <Receipt className="h-8 w-8 text-blue-500" />,
    type: "lists"
  },
  "comparative-chart": {
    id: "comparative-chart",
    title: "Comparativa Financiera",
    description: "Análisis trimestral de ingresos, gastos y resultados.",
    component: ComparativeChart,
    icon: <BarChart className="h-8 w-8 text-indigo-500" />,
    type: "charts"
  },
  "expenses-by-category": {
    id: "expenses-by-category",
    title: "Gastos por Categoría",
    description: "Distribución de gastos clasificados por categoría.",
    component: ExpensesSummary,
    icon: <PieChart className="h-8 w-8 text-yellow-500" />,
    type: "charts"
  },
  "expenses-by-category-chart": {
    id: "expenses-by-category-chart",
    title: "Pagos por Categoría",
    description: "Análisis detallado de pagos con gráfico de sectores.",
    component: ExpensesByCategory,
    icon: <Filter className="h-8 w-8 text-gray-800" />,
    type: "charts"
  },
  "tax-summary": {
    id: "tax-summary",
    title: "Resumen Fiscal",
    description: "Resumen de impuestos a pagar y retenciones a favor.",
    component: TaxSummary,
    icon: <DollarSign className="h-8 w-8 text-emerald-500" />,
    type: "charts"
  }
};

// Versión para el catálogo que incluye previsualizaciones
export const DASHBOARD_BLOCK_CATALOG = [
  {
    ...DASHBOARD_BLOCKS["expenses-by-category-chart"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-gray-50 py-1 px-2 flex items-center border-b">
          <Filter className="h-3 w-3 text-gray-600 mr-1" />
          <span className="text-[10px] font-medium text-gray-800">Pagos por Categoría</span>
        </div>
        <div className="flex-1 p-1 flex justify-center items-center">
          <svg width="35" height="35" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="25" fill="white" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#000000" strokeWidth="20" strokeDasharray="180 252" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#4355b9" strokeWidth="20" strokeDasharray="30 252" strokeDashoffset="-180" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6f42c1" strokeWidth="20" strokeDasharray="15 252" strokeDashoffset="-210" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3355b9" strokeWidth="20" strokeDasharray="10 252" strokeDashoffset="-225" />
          </svg>
        </div>
      </div>
    )
  },
  {
    ...DASHBOARD_BLOCKS["result-summary"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-green-50 py-1 px-2 flex items-center border-b">
          <BarChart3 className="h-3 w-3 text-green-600 mr-1" />
          <span className="text-[10px] font-medium text-green-800">Resumen de Resultados</span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center p-2">
          <div className="mb-1 text-[8px] text-center text-gray-500">Vista previa</div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-green-600">258.800 €</span>
            <span className="text-[8px] text-green-700">Resultado bruto</span>
          </div>
        </div>
      </div>
    )
  },
  {
    ...DASHBOARD_BLOCKS["quotes-summary"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-purple-50 py-1 px-2 flex items-center border-b">
          <FileText className="h-3 w-3 text-purple-600 mr-1" />
          <span className="text-[10px] font-medium text-purple-800">Presupuestos</span>
        </div>
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <div className="flex space-x-2 justify-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center">
                <CheckCircle className="h-2 w-2 text-green-500" />
                <span className="text-[7px] ml-0.5">Aceptados</span>
              </div>
              <span className="text-[9px] font-bold">3</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center">
                <XCircle className="h-2 w-2 text-red-500" />
                <span className="text-[7px] ml-0.5">Rechazados</span>
              </div>
              <span className="text-[9px] font-bold">1</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    ...DASHBOARD_BLOCKS["invoices-summary"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-blue-50 py-1 px-2 flex items-center border-b">
          <Receipt className="h-3 w-3 text-blue-600 mr-1" />
          <span className="text-[10px] font-medium text-blue-800">Facturas</span>
        </div>
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <div className="flex flex-col items-center mb-1">
            <span className="text-[10px] font-bold text-blue-600">258.800 €</span>
            <span className="text-[7px] text-gray-500">Facturación total</span>
          </div>
          <div className="w-full flex items-center justify-between">
            <div className="text-[7px] flex items-center">
              <Clock className="h-2 w-2 text-amber-500 mr-0.5" />
              <span>Pendiente</span>
            </div>
            <span className="text-[7px] font-bold">0%</span>
          </div>
        </div>
      </div>
    )
  },
  {
    ...DASHBOARD_BLOCKS["comparative-chart"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-indigo-50 py-1 px-2 flex items-center border-b">
          <BarChart className="h-3 w-3 text-indigo-600 mr-1" />
          <span className="text-[10px] font-medium text-indigo-800">Comparativa Financiera</span>
        </div>
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <svg width="40" height="24" viewBox="0 0 80 40" className="mt-1">
            <rect x="5" y="5" width="10" height="30" fill="#4F46E5" />
            <rect x="20" y="15" width="10" height="20" fill="#EF4444" />
            <rect x="35" y="10" width="10" height="25" fill="#10B981" />
            <rect x="50" y="18" width="10" height="17" fill="#4F46E5" />
            <rect x="65" y="25" width="10" height="10" fill="#EF4444" />
          </svg>
          <div className="mt-1 flex justify-center space-x-2">
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <span className="text-[6px] ml-0.5">Ingresos</span>
            </div>
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span className="text-[6px] ml-0.5">Gastos</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    ...DASHBOARD_BLOCKS["expenses-by-category"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-yellow-50 py-1 px-2 flex items-center border-b">
          <PieChart className="h-3 w-3 text-yellow-600 mr-1" />
          <span className="text-[10px] font-medium text-yellow-800">Gastos por Categoría</span>
        </div>
        <div className="flex-1 p-1 flex justify-center items-center">
          <svg width="35" height="35" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ddd" strokeWidth="20" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#FBBF24" strokeWidth="20" strokeDasharray="50 200" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#34D399" strokeWidth="20" strokeDasharray="75 200" strokeDashoffset="-50" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#60A5FA" strokeWidth="20" strokeDasharray="40 200" strokeDashoffset="-125" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F87171" strokeWidth="20" strokeDasharray="25 200" strokeDashoffset="-165" />
          </svg>
        </div>
      </div>
    )
  },
  {
    ...DASHBOARD_BLOCKS["tax-summary"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-emerald-50 py-1 px-2 flex items-center border-b">
          <DollarSign className="h-3 w-3 text-emerald-600 mr-1" />
          <span className="text-[10px] font-medium text-emerald-800">Resumen Fiscal</span>
        </div>
        <div className="flex-1 p-1 flex flex-col justify-center">
          <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-0.5 mb-0.5">
            <span className="text-[7px]">IVA a Liquidar</span>
            <span className="text-[7px] font-semibold">48.300 €</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[7px]">IRPF a Pagar</span>
            <span className="text-[7px] font-semibold">30.000 €</span>
          </div>
        </div>
      </div>
    )
  }
];