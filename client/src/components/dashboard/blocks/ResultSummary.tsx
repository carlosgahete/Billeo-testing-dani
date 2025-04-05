import React from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import ResultSummarySmall from "../widgets/small/ResultSummarySmall";
import ResultSummaryMedium from "../widgets/medium/ResultSummaryMedium";
import ResultSummaryLarge from "../widgets/large/ResultSummaryLarge";
import { WidgetSizeType } from "@/config/widgetSizes";

interface ResultSummaryProps {
  size: WidgetSizeType;
}

const ResultSummary: React.FC<ResultSummaryProps> = ({ size }) => {
  const { data, isLoading } = useDashboardData();
  
  // Renderizar el componente específico según el tamaño
  switch (size) {
    case "small":
      return <ResultSummarySmall data={data || {income: 0, expenses: 0}} isLoading={isLoading} />;
    
    case "medium":
      return <ResultSummaryMedium data={data || {income: 0, expenses: 0}} isLoading={isLoading} />;
    
    case "large":
      return <ResultSummaryLarge data={data || {income: 0, expenses: 0}} isLoading={isLoading} />;
    
    default:
      return <ResultSummaryMedium data={data || {income: 0, expenses: 0}} isLoading={isLoading} />;
  }
};

export default ResultSummary;