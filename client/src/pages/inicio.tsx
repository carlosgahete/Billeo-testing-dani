import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, BarChart3, FileText, ReceiptText, FileBarChart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InicioPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="flex items-center">
          <BarChart3 className="h-6 w-6 text-blue-500 mr-2" />
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
          <Select>
            <SelectTrigger className="w-[120px] bg-white shadow-sm">
              <SelectValue placeholder="2025" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="w-[150px] bg-white shadow-sm">
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
        <Card className="shadow-sm bg-white rounded-2xl overflow-hidden border-0">
          <CardContent className="p-6 pt-7">
            <div className="flex items-start">
              <ArrowUpCircle className="h-6 w-6 text-green-500 mr-2 mt-0.5" />
              <div>
                <span className="text-gray-800 font-medium text-lg">Ingresos</span>
                <p className="text-gray-500 text-sm mt-1">Entradas totales</p>
              </div>
            </div>
            <div className="mt-7 mb-1">
              <div className="text-4xl font-semibold text-green-500">—</div>
              <div className="text-sm text-gray-500 mt-1">Ingresos totales (sin IVA)</div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-6 border-t border-gray-100 pt-4">
              <div>
                <div className="text-gray-500 text-sm">IVA repercutido:</div>
                <div className="text-gray-800 font-medium mt-1">—</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">IRPF:</div>
                <div className="text-gray-800 font-medium mt-1">—</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 p-0">
            <Button variant="ghost" className="w-full rounded-none h-12 text-blue-500 font-medium hover:text-blue-600 hover:bg-gray-100 flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              Ver facturas
            </Button>
          </CardFooter>
        </Card>
        
        {/* Tarjeta de Gastos */}
        <Card className="shadow-sm bg-white rounded-2xl overflow-hidden border-0">
          <CardContent className="p-6 pt-7">
            <div className="flex items-start">
              <ArrowDownCircle className="h-6 w-6 text-red-500 mr-2 mt-0.5" />
              <div>
                <span className="text-gray-800 font-medium text-lg">Gastos</span>
                <p className="text-gray-500 text-sm mt-1">Salidas totales</p>
              </div>
            </div>
            <div className="mt-7 mb-1">
              <div className="text-4xl font-semibold text-red-500">—</div>
              <div className="text-sm text-gray-500 mt-1">Gastos totales</div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-6 border-t border-gray-100 pt-4">
              <div>
                <div className="text-gray-500 text-sm">IVA soportado:</div>
                <div className="text-gray-800 font-medium mt-1">—</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">IRPF:</div>
                <div className="text-gray-800 font-medium mt-1">—</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 p-0">
            <Button variant="ghost" className="w-full rounded-none h-12 text-red-500 font-medium hover:text-red-600 hover:bg-gray-100 flex items-center justify-center gap-2">
              <ReceiptText className="h-4 w-4" />
              Ver gastos
            </Button>
          </CardFooter>
        </Card>
        
        {/* Tarjeta de Resultado */}
        <Card className="shadow-sm bg-white rounded-2xl overflow-hidden border-0">
          <CardContent className="p-6 pt-7">
            <div className="flex items-start">
              <BarChart3 className="h-6 w-6 text-blue-500 mr-2 mt-0.5" />
              <div>
                <span className="text-gray-800 font-medium text-lg">Resultado Final</span>
                <p className="text-gray-500 text-sm mt-1">Ingresos - Gastos</p>
              </div>
            </div>
            <div className="mt-7 mb-1">
              <div className="text-4xl font-semibold text-blue-500">—</div>
              <div className="text-sm text-gray-500 mt-1">Beneficio neto</div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-6 border-t border-gray-100 pt-4">
              <div>
                <div className="text-gray-500 text-sm">IVA a pagar:</div>
                <div className="text-gray-800 font-medium mt-1">—</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">IRPF a pagar:</div>
                <div className="text-gray-800 font-medium mt-1">—</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 p-0">
            <Button variant="ghost" className="w-full rounded-none h-12 text-blue-500 font-medium hover:text-blue-600 hover:bg-gray-100 flex items-center justify-center gap-2">
              <FileBarChart className="h-4 w-4" />
              Ver informes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}