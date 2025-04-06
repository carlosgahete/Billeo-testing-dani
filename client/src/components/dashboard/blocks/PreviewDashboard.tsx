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
import { BarChart3 } from "lucide-react";

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
      {/* Year and period selectors - Estilo minimalista */}
      <div className="relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-[#04C4D9] p-2 rounded-full mr-3">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="text-lg font-semibold text-gray-800">Resumen Contable</div>
          </div>
          <div className="flex space-x-2 bg-gray-50 p-2 rounded-lg">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-24 border-gray-200 h-9">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 border-gray-200 h-9">
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
      </div>

      {/* Three summary blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IncomeSummary data={dashboardStats} isLoading={isLoading} />
        <ExpensesSummary data={dashboardStats} isLoading={isLoading} />
        <ResultSummary data={dashboardStats} isLoading={isLoading} />
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