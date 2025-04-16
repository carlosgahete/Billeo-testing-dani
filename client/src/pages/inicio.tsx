import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, BarChart3, Info, PiggyBank } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function InicioPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
          <Select>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="2025" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Todo el año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="q1">1er Trimestre</SelectItem>
              <SelectItem value="q2">2º Trimestre</SelectItem>
              <SelectItem value="q3">3er Trimestre</SelectItem>
              <SelectItem value="q4">4º Trimestre</SelectItem>
              <SelectItem value="all">Todo el año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tarjeta de Ingresos */}
        <Card className="overflow-hidden flex-grow">
          <CardHeader className="bg-emerald-50 p-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-emerald-700 flex items-center">
                <ArrowUpCircle className="mr-2 h-5 w-5" />
                Ingresos
              </CardTitle>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-pointer">
                      <Info className="h-4 w-4 text-neutral-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                    <p className="w-[200px] text-xs">Ingresos totales sin IVA con desglose de impuestos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {/* Base imponible */}
            <div className="mb-2">
              <h3 className="text-sm font-medium text-emerald-700">Entradas totales</h3>
              <p className="text-2xl font-bold text-emerald-600">—</p>
              <p className="text-xs text-gray-500 mt-1">Ingresos totales (sin IVA)</p>
            </div>
            
            {/* Impuestos desglosados */}
            <div className="mb-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">IVA repercutido:</span>
                <span className="font-medium text-emerald-600">—</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-neutral-500">IRPF:</span>
                <span className="font-medium text-red-600">—</span>
              </div>
            </div>
            
            <div className="mt-auto pt-3 mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-emerald-600 border-emerald-300 hover:bg-emerald-50"
              >
                Ver facturas
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Tarjeta de Gastos */}
        <Card className="overflow-hidden flex-grow">
          <CardHeader className="bg-red-50 p-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-red-700 flex items-center">
                <ArrowDownCircle className="mr-2 h-5 w-5" />
                Gastos
              </CardTitle>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-pointer">
                      <Info className="h-4 w-4 text-neutral-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                    <p className="w-[200px] text-xs">Gastos totales sin IVA con desglose de impuestos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {/* Base imponible */}
            <div className="mb-2">
              <h3 className="text-sm font-medium text-red-700">Salidas totales</h3>
              <p className="text-2xl font-bold text-red-600">—</p>
              <p className="text-xs text-gray-500 mt-1">Gastos totales</p>
            </div>
            
            {/* Impuestos desglosados */}
            <div className="mb-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">IVA soportado:</span>
                <span className="font-medium text-red-600">—</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-neutral-500">IRPF:</span>
                <span className="font-medium text-emerald-600">—</span>
              </div>
            </div>
            
            <div className="mt-auto pt-3 mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                Ver gastos
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Tarjeta de Resultado */}
        <Card className="overflow-hidden flex-grow">
          <CardHeader className="bg-blue-50 p-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-blue-700 flex items-center">
                <PiggyBank className="mr-2 h-5 w-5" />
                Resultado Final
              </CardTitle>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-pointer">
                      <Info className="h-4 w-4 text-neutral-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                    <p className="w-[200px] text-xs">Beneficio neto e impuestos a pagar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {/* Ingresos - Gastos */}
            <div className="mb-2">
              <h3 className="text-sm font-medium text-blue-700">Ingresos - Gastos</h3>
              <p className="text-2xl font-bold text-blue-600">—</p>
              <p className="text-xs text-gray-500 mt-1">Beneficio neto</p>
            </div>
            
            {/* Impuestos a pagar */}
            <div className="mb-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">IVA a pagar:</span>
                <span className="font-medium text-blue-600">—</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-neutral-500">IRPF a pagar:</span>
                <span className="font-medium text-blue-600">—</span>
              </div>
            </div>
            
            <div className="mt-auto pt-3 mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                Ver informes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}