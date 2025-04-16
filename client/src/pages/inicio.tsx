import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InicioPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <Select>
            <SelectTrigger className="w-[120px] bg-white shadow-sm rounded-xl">
              <SelectValue placeholder="2025" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="w-[150px] bg-white shadow-sm rounded-xl">
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
      
      {/* Tarjetas principales - Estilo Apple con medidas iguales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta de Ingresos */}
        <Card className="bg-white rounded-3xl shadow-sm border-0 overflow-hidden transition-all duration-300 hover:shadow-md h-[340px] flex flex-col">
          <div className="p-6 flex-grow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <ArrowUpCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Ingresos</h3>
                <p className="text-sm text-gray-500">Entradas totales</p>
              </div>
            </div>
            
            <div className="mt-4 mb-6">
              <p className="text-3xl font-bold text-green-600">—</p>
              <p className="text-sm text-gray-500 mt-1">Ingresos totales (sin IVA)</p>
            </div>
            
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">IVA repercutido:</p>
                <p className="text-sm font-medium text-gray-900">—</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">IRPF:</p>
                <p className="text-sm font-medium text-red-500">—</p>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 mt-auto">
            <Button 
              variant="ghost" 
              className="w-full h-10 rounded-xl text-green-600 hover:bg-green-50 transition-colors duration-300"
            >
              Ver facturas
            </Button>
          </div>
        </Card>
        
        {/* Tarjeta de Gastos */}
        <Card className="bg-white rounded-3xl shadow-sm border-0 overflow-hidden transition-all duration-300 hover:shadow-md h-[340px] flex flex-col">
          <div className="p-6 flex-grow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <ArrowDownCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Gastos</h3>
                <p className="text-sm text-gray-500">Salidas totales</p>
              </div>
            </div>
            
            <div className="mt-4 mb-6">
              <p className="text-3xl font-bold text-red-600">—</p>
              <p className="text-sm text-gray-500 mt-1">Gastos totales</p>
            </div>
            
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">IVA soportado:</p>
                <p className="text-sm font-medium text-gray-900">—</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">IRPF:</p>
                <p className="text-sm font-medium text-gray-900">—</p>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 mt-auto">
            <Button 
              variant="ghost" 
              className="w-full h-10 rounded-xl text-red-600 hover:bg-red-50 transition-colors duration-300"
            >
              Ver gastos
            </Button>
          </div>
        </Card>
        
        {/* Tarjeta de Resultado */}
        <Card className="bg-white rounded-3xl shadow-sm border-0 overflow-hidden transition-all duration-300 hover:shadow-md h-[340px] flex flex-col">
          <div className="p-6 flex-grow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Resultado Final</h3>
                <p className="text-sm text-gray-500">Ingresos - Gastos</p>
              </div>
            </div>
            
            <div className="mt-4 mb-6">
              <p className="text-3xl font-bold text-blue-600">—</p>
              <p className="text-sm text-gray-500 mt-1">Beneficio neto</p>
            </div>
            
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">IVA a pagar:</p>
                <p className="text-sm font-medium text-gray-900">—</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">IRPF a pagar:</p>
                <p className="text-sm font-medium text-gray-900">—</p>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 mt-auto">
            <Button 
              variant="ghost" 
              className="w-full h-10 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors duration-300"
            >
              Ver informes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}