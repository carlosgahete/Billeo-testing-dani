import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/types/dashboard";
import IncomeSummary from "./IncomeSummary";
import ExpensesSummary from "./ExpensesSummary";
import ResultSummary from "./ResultSummary";
import QuotesSummary from "./QuotesSummary";
import InvoicesSummary from "./InvoicesSummary";
import ComparativeChart from "./ComparativeChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface PreviewDashboardProps {
  userId: number;
}

const defaultDashboardStats: DashboardStats = {
  income: 230000,
  expenses: 0,
  pendingInvoices: 0,
  pendingCount: 0,
  quotesTotal: 5,
  quotesAccepted: 3,
  quotesRejected: 1,
  quotesPending: 0,
  invoicesTotal: 0,
  invoicesPending: 0,
  invoicesPaid: 0,
  invoicesOverdue: 0
};

const PreviewDashboard: React.FC<PreviewDashboardProps> = ({ userId }) => {
  const [year, setYear] = useState<string>("2025");
  const [period, setPeriod] = useState<string>("all");

  // Fetch dashboard stats
  const { data: statsData, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", year, period],
    enabled: !!userId,
  });

  const dashboardStats = statsData || defaultDashboardStats;

  return (
    <div className="space-y-4">
      {/* Year and period selectors */}
      <div className="flex justify-between items-center bg-blue-600 p-4 rounded-lg text-white">
        <div className="text-lg font-semibold">Resumen Contable</div>
        <div className="flex space-x-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24 bg-white/20 border-white/40 text-white">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-white/20 border-white/40 text-white">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el año</SelectItem>
              <SelectItem value="Q1">1er trimestre</SelectItem>
              <SelectItem value="Q2">2º trimestre</SelectItem>
              <SelectItem value="Q3">3er trimestre</SelectItem>
              <SelectItem value="Q4">4º trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tres bloques de resumen - en móvil: ingresos y gastos en fila, resultado abajo */}
      <div className="space-y-4">
        {/* Ingresos y gastos en la misma fila en móvil */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <IncomeSummary data={dashboardStats} isLoading={isLoading} />
          <ExpensesSummary data={dashboardStats} isLoading={isLoading} />
          <div className="col-span-2 md:col-span-1">
            <ResultSummary data={dashboardStats} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* Two blocks side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuotesSummary data={dashboardStats} isLoading={isLoading} />
        <InvoicesSummary data={dashboardStats} isLoading={isLoading} />
      </div>

      {/* Financial chart */}
      <div>
        <ComparativeChart data={dashboardStats} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default PreviewDashboard;