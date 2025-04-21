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
  Filter,
  ReceiptText,
  ArrowUpFromLine,
  ArrowDownToLine,
  PiggyBank
} from "lucide-react";
import ResultSummary from "@/components/dashboard/blocks/ResultSummary";
import QuotesSummary from "@/components/dashboard/blocks/QuotesSummary";
import InvoicesSummary from "@/components/dashboard/blocks/InvoicesSummary";
import ComparativeChart from "@/components/dashboard/blocks/ComparativeChart";
import ExpensesSummary from "@/components/dashboard/blocks/ExpensesSummary";
import TaxSummary from "@/components/dashboard/blocks/TaxSummary";
import ExpensesByCategory from "@/components/dashboard/blocks/ExpensesByCategory";
import RecentExpensesByCategory from "@/components/dashboard/blocks/RecentExpensesByCategory";
import ExpensesByCategoryModerno from "@/components/dashboard/ExpensesByCategoryModerno";
import IncomeSummaryCard from "@/components/dashboard/blocks/IncomeSummaryCard";
import ExpensesSummaryCard from "@/components/dashboard/blocks/ExpensesSummaryCard";
import FinalResultCard from "@/components/dashboard/blocks/FinalResultCard";

// Definición de los bloques disponibles para el dashboard
// Esto centraliza la configuración para que sea usada tanto por el diálogo
// de adición de bloques como por el dashboard personalizable
export const DASHBOARD_BLOCKS = {
  "income-summary": {
    id: "income-summary",
    title: "Ingresos",
    description: "Resumen de los ingresos y facturación.",
    component: ({ data, isLoading }: { data: any, isLoading: boolean }) => (
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center p-3 bg-green-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
          <h3 className="text-lg font-medium">Ingresos</h3>
        </div>
        <div className="p-4">
          <p className="text-2xl font-semibold mb-2">
            {data?.income ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.income / 100) : "0,00 €"}
          </p>
          
          <div className="text-sm text-gray-600 flex justify-between border-t pt-2">
            <span>IVA repercutido:</span>
            <span className="font-medium">
              {data?.taxes?.vat ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.taxes.vat / 100) : "0,00 €"}
            </span>
          </div>
          
          <div className="mt-4">
            <button className="text-blue-600 text-sm w-full border border-blue-600 rounded-md py-1.5 hover:bg-blue-50 transition">
              Ver facturas
            </button>
          </div>
          
          <div className="mt-2">
            <button className="text-blue-600 text-sm w-full border border-blue-600 rounded-md py-1.5 hover:bg-blue-50 transition">
              Ver ingresos
            </button>
          </div>
        </div>
      </div>
    ),
    icon: <TrendingUp className="h-8 w-8 text-green-500" />,
    type: "charts"
  },
  "expenses-summary": {
    id: "expenses-summary",
    title: "Gastos",
    description: "Resumen de los gastos y deducciones.",
    component: ({ data, isLoading }: { data: any, isLoading: boolean }) => (
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center p-3 bg-red-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
            <polyline points="16 17 22 17 22 11"></polyline>
          </svg>
          <h3 className="text-lg font-medium">Gastos</h3>
        </div>
        <div className="p-4">
          <p className="text-2xl font-semibold mb-2">
            {data?.expenses ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.expenses / 100) : "0,00 €"}
          </p>
          
          <div className="text-sm text-gray-600 flex justify-between border-t pt-2">
            <span>IVA soportado en los gastos:</span>
            <span className="font-medium">
              {data?.taxes?.ivaSoportado ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.taxes.ivaSoportado / 100) : "0,00 €"}
            </span>
          </div>
          
          <div className="text-sm text-gray-600 flex justify-between pt-1">
            <span>IRPF a liquidar por gastos:</span>
            <span className="font-medium">
              -{data?.taxes?.irpfGastos ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.taxes.irpfGastos / 100) : "0,00 €"}
            </span>
          </div>
          
          <div className="mt-4">
            <button className="text-blue-600 text-sm w-full border border-blue-600 rounded-md py-1.5 hover:bg-blue-50 transition">
              Ver gastos
            </button>
          </div>
        </div>
      </div>
    ),
    icon: <TrendingUp className="h-8 w-8 text-red-500 transform rotate-180" />,
    type: "charts"
  },
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
  "recent-expenses": {
    id: "recent-expenses",
    title: "Gastos Recientes",
    description: "Listado de últimos gastos clasificados por categoría.",
    component: RecentExpensesByCategory,
    icon: <ReceiptText className="h-8 w-8 text-pink-500" />,
    type: "lists"
  },
  "tax-summary": {
    id: "tax-summary",
    title: "Resumen Fiscal",
    description: "Resumen de impuestos a pagar y retenciones a favor.",
    component: TaxSummary,
    icon: <DollarSign className="h-8 w-8 text-emerald-500" />,
    type: "charts"
  },

  "income-card": {
    id: "income-card",
    title: "Tarjeta de Ingresos",
    description: "Tarjeta con resumen detallado de ingresos y enlaces",
    component: IncomeSummaryCard,
    icon: <ArrowUpFromLine className="h-8 w-8 text-emerald-500" />,
    type: "cards"
  },
  "expenses-card": {
    id: "expenses-card",
    title: "Tarjeta de Gastos",
    description: "Tarjeta con detalle de gastos y sus impuestos asociados",
    component: ExpensesSummaryCard,
    icon: <ArrowDownToLine className="h-8 w-8 text-red-500" />,
    type: "cards"
  },
  "result-card": {
    id: "result-card",
    title: "Resultado Final",
    description: "Tarjeta con el balance final e impuestos a liquidar",
    component: FinalResultCard,
    icon: <PiggyBank className="h-8 w-8 text-blue-500" />,
    type: "cards"
  },
  "expenses-by-category-card": {
    id: "expenses-by-category-card",
    title: "Gastos por Categoría (Moderno)",
    description: "Visualización moderna de gastos por categoría con gráfico estilo Apple",
    component: ExpensesByCategoryModerno,
    icon: <PieChart className="h-8 w-8 text-red-600" />,
    type: "cards"
  }
};

// Versión para el catálogo que incluye previsualizaciones
export const DASHBOARD_BLOCK_CATALOG = [
  {
    ...DASHBOARD_BLOCKS["recent-expenses"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-pink-50 py-1 px-2 flex items-center border-b">
          <ReceiptText className="h-3 w-3 text-pink-600 mr-1" />
          <span className="text-[10px] font-medium text-pink-800">Gastos Recientes</span>
        </div>
        <div className="flex-1 p-1 flex flex-col justify-center gap-1">
          <div className="flex items-center justify-between bg-gray-50 rounded-sm p-1">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-indigo-100 flex items-center justify-center mr-1">
                <span className="text-[6px]">💼</span>
              </div>
              <span className="text-[6px]">Material oficina</span>
            </div>
            <span className="text-[6px] font-medium text-red-600">-35,00 €</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-sm p-1">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-100 flex items-center justify-center mr-1">
                <span className="text-[6px]">💡</span>
              </div>
              <span className="text-[6px]">Suministros</span>
            </div>
            <span className="text-[6px] font-medium text-red-600">-42,10 €</span>
          </div>
        </div>
      </div>
    )
  },
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
  },

  {
    ...DASHBOARD_BLOCKS["income-card"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-emerald-50 py-1 px-2 flex items-center border-b">
          <ArrowUpFromLine className="h-3 w-3 text-emerald-600 mr-1" />
          <span className="text-[10px] font-medium text-emerald-800">Ingresos</span>
        </div>
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <div className="flex flex-col items-center mb-1">
            <span className="text-[10px] font-bold text-emerald-600">230.000,00 €</span>
            <span className="text-[7px] text-gray-500">Total ingresos</span>
          </div>
          <div className="w-full flex items-center justify-between">
            <div className="text-[7px] flex items-center">
              <span>IVA rep:</span>
            </div>
            <span className="text-[7px] font-bold">48.300 €</span>
          </div>
        </div>
      </div>
    )
  },
  {
    ...DASHBOARD_BLOCKS["expenses-card"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-red-50 py-1 px-2 flex items-center border-b">
          <ArrowDownToLine className="h-3 w-3 text-red-600 mr-1" />
          <span className="text-[10px] font-medium text-red-800">Gastos</span>
        </div>
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <div className="flex flex-col items-center mb-1">
            <span className="text-[10px] font-bold text-red-600">0,00 €</span>
            <span className="text-[7px] text-gray-500">Total gastos</span>
          </div>
          <div className="w-full flex items-center justify-between">
            <div className="text-[7px] flex items-center">
              <span>IVA sop:</span>
            </div>
            <span className="text-[7px] font-bold">0 €</span>
          </div>
        </div>
      </div>
    )
  },
  {
    ...DASHBOARD_BLOCKS["result-card"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-blue-50 py-1 px-2 flex items-center border-b">
          <PiggyBank className="h-3 w-3 text-blue-600 mr-1" />
          <span className="text-[10px] font-medium text-blue-800">Resultado Final</span>
        </div>
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <div className="flex flex-col items-center mb-1">
            <span className="text-[10px] font-bold text-blue-600">230.000,00 €</span>
            <span className="text-[7px] text-gray-500">Balance final</span>
          </div>
          <div className="w-full flex items-center justify-between">
            <div className="text-[7px] flex items-center">
              <span>IVA liq:</span>
            </div>
            <span className="text-[7px] font-bold">48.300 €</span>
          </div>
        </div>
      </div>
    )
  },
  {
    ...DASHBOARD_BLOCKS["expenses-by-category-card"],
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-red-50 py-1 px-2 flex items-center border-b">
          <PieChart className="h-3 w-3 text-red-600 mr-1" />
          <span className="text-[10px] font-medium text-red-800">Gastos por Categoría</span>
        </div>
        <div className="flex-1 p-1 flex flex-col gap-1 justify-center">
          <div className="flex items-center gap-1">
            <span className="text-[6px]">📦</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-[6px]">Alquiler</span>
                <span className="text-[6px] text-red-600">-2.700€</span>
              </div>
              <div className="bg-gray-100 h-[2px] w-full rounded-full overflow-hidden">
                <div className="bg-red-500 h-full w-[60%]"></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[6px]">💡</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-[6px]">Suministros</span>
                <span className="text-[6px] text-red-600">-240€</span>
              </div>
              <div className="bg-gray-100 h-[2px] w-full rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[20%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
];