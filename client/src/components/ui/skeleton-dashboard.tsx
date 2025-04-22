import React from "react";
import { Card } from "@/components/ui/card";
import { BarChart3, PiggyBank, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkeletonDashboardProps {
  message: string;
  submessage?: string;
  className?: string;
}

/**
 * Componente de skeleton loading para el dashboard
 * Muestra una estructura visual similar al dashboard pero con elementos de carga
 */
export function SkeletonDashboard({ message, submessage, className }: SkeletonDashboardProps) {
  return (
    <div className={cn("container-apple section-apple bg-[#F9F9F9] px-0 mx-0 sm:px-4 pb-36 mb-12 -mt-6", className)}>
      {/* Mantener la estructura base pero con elementos visuales de carga */}
      <div className="section-header px-0 pt-0 md:pt-0 pb-0 md:px-4 md:py-4">
        <div className="flex items-center justify-center md:justify-start mt-[-15px] md:mt-0">
          <div className="md:flex hidden items-center mt-8">
            <BarChart3 className="h-6 w-6 text-primary mr-3" />
          </div>
          <h1 className="section-title text-sm md:text-lg font-medium hidden md:block mt-7 -mb-1">Dashboard</h1>
        </div>
      </div>
      
      {/* Mensaje de carga con animación */}
      <div className="w-full mt-4 mb-6 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-md px-4 py-2 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm text-blue-700 font-medium">{message}</p>
        </div>
      </div>
      
      {/* Skeleton para la sección de KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mx-2 md:mx-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 shadow-sm rounded-xl overflow-hidden bg-white animate-pulse">
            <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 w-24 bg-gray-300 rounded-md mt-2"></div>
            <div className="h-4 w-36 bg-gray-100 rounded mt-2"></div>
          </Card>
        ))}
      </div>
      
      {/* Skeleton para el gráfico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 mx-2 md:mx-4">
        <Card className="p-4 shadow-sm rounded-xl overflow-hidden bg-white h-[350px] animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-[250px] bg-gray-100 rounded-md flex items-center justify-center">
            <BarChart3 className="h-16 w-16 text-gray-300" />
          </div>
        </Card>
        
        <Card className="p-4 shadow-sm rounded-xl overflow-hidden bg-white h-[350px] animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-[250px] bg-gray-100 rounded-md flex items-center justify-center">
            <PiggyBank className="h-16 w-16 text-gray-300" />
          </div>
        </Card>
      </div>
      
      {/* Parte inferior con más información de carga */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Los datos se están cargando, esto puede tomar unos segundos...</p>
        {submessage && <p className="mt-2 text-xs">{submessage}</p>}
      </div>
    </div>
  );
}