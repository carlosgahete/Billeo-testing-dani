import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Clock, FileCheck } from "lucide-react";

interface QuickStatsProps {
  data: any;
  isLoading: boolean;
}

const QuickStats: React.FC<QuickStatsProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-8 w-32 mt-2" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Definición de las tarjetas estadísticas utilizando guiones en lugar de valores fijos
  const stats = [
    {
      title: "Ingresos totales",
      value: "—",
      description: "Base imponible sin IVA",
      icon: <ArrowUp className="h-6 w-6 text-emerald-500" />,
      color: "bg-emerald-50",
    },
    {
      title: "Gastos totales",
      value: "—",
      description: "Base imponible sin IVA",
      icon: <ArrowDown className="h-6 w-6 text-red-500" />,
      color: "bg-red-50",
    },
    {
      title: "Resultado Neto",
      value: "—",
      description: "Después de impuestos",
      icon: <FileCheck className="h-6 w-6 text-blue-500" />,
      color: "bg-blue-50",
    },
    {
      title: "IVA a Liquidar",
      value: "—",
      description: "IVA repercutido - soportado",
      icon: <Clock className="h-6 w-6 text-purple-500" />,
      color: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className={`p-4 ${stat.color}`}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
              <div className="rounded-full p-2 bg-white">{stat.icon}</div>
            </div>
            <p className="text-2xl font-bold mt-2">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuickStats;