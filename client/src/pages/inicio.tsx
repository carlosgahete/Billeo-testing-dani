import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InicioPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="flex items-center">
          <BarChart2 className="h-6 w-6 text-blue-500 mr-2" />
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta de Ingresos */}
        <Card className="shadow-sm bg-white rounded-xl overflow-hidden border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-gray-600 font-medium">Ingresos</span>
            </div>
            <div className="text-sm text-gray-500 mb-2">Entradas totales</div>
            <div className="text-3xl font-bold text-green-500 mb-4">—</div>
            <div className="text-sm text-gray-500 mb-5">Ingresos totales (sin IVA)</div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <div className="text-gray-500 text-xs mb-1">IVA repercutido:</div>
                <div className="text-gray-700">—</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">IRPF:</div>
                <div className="text-gray-700">—</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 p-0">
            <Button variant="ghost" className="w-full rounded-none h-12 text-blue-500 hover:text-blue-600 hover:bg-gray-100">
              Ver facturas
            </Button>
          </CardFooter>
        </Card>
        
        {/* Tarjeta de Gastos */}
        <Card className="shadow-sm bg-white rounded-xl overflow-hidden border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-gray-600 font-medium">Gastos</span>
            </div>
            <div className="text-sm text-gray-500 mb-2">Salidas totales</div>
            <div className="text-3xl font-bold text-red-500 mb-4">—</div>
            <div className="text-sm text-gray-500 mb-5">Gastos totales</div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <div className="text-gray-500 text-xs mb-1">IVA soportado:</div>
                <div className="text-gray-700">—</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">IRPF:</div>
                <div className="text-gray-700">—</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 p-0">
            <Button variant="ghost" className="w-full rounded-none h-12 text-red-500 hover:text-red-600 hover:bg-gray-100">
              Ver gastos
            </Button>
          </CardFooter>
        </Card>
        
        {/* Tarjeta de Resultado */}
        <Card className="shadow-sm bg-white rounded-xl overflow-hidden border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <BarChart2 className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-gray-600 font-medium">Resultado Final</span>
            </div>
            <div className="text-sm text-gray-500 mb-2">Ingresos - Gastos</div>
            <div className="text-3xl font-bold text-blue-500 mb-4">—</div>
            <div className="text-sm text-gray-500 mb-5">Beneficio neto</div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <div className="text-gray-500 text-xs mb-1">IVA a pagar:</div>
                <div className="text-gray-700">—</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">IRPF a pagar:</div>
                <div className="text-gray-700">—</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 p-0">
            <Button variant="ghost" className="w-full rounded-none h-12 text-blue-500 hover:text-blue-600 hover:bg-gray-100">
              Ver informes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}