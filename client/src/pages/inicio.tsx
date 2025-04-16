import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  BarChart3,
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  Percent,
  Calendar,
  Euro
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InicioPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard de Resultados</h1>
        
        {/* Filtros (desactivados por ahora) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
          <Select disabled>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="2025" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          
          <Select disabled>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Trimestre actual" />
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
      
      {/* SECCIÓN 1: VISIÓN GENERAL TRIMESTRAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Tarjeta de Ingresos */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white pb-3">
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="mr-2" />
              Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-4xl font-bold mb-4 text-center">
              —
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">IVA:</span>
                <span className="font-medium">—</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">IRPF:</span>
                <span className="font-medium">—</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Tarjeta de Gastos */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white pb-3">
            <CardTitle className="flex items-center text-lg">
              <TrendingDown className="mr-2" />
              Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-4xl font-bold mb-4 text-center">
              —
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">IVA:</span>
                <span className="font-medium">—</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">IRPF:</span>
                <span className="font-medium">—</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* SECCIÓN 2: RESULTADO Y FISCALIDAD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Resultado del Trimestre */}
        <Card className="shadow-md md:col-span-1">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white pb-3">
            <CardTitle className="flex items-center text-lg">
              <Euro className="mr-2" />
              Resultado Neto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-center">
              —
            </div>
            <div className="mt-2 text-sm text-gray-500 text-center">
              Resultado del trimestre
            </div>
          </CardContent>
        </Card>
        
        {/* IVA a pagar */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white pb-3">
            <CardTitle className="flex items-center text-lg">
              <Percent className="mr-2" />
              IVA a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-center">
              —
            </div>
            <div className="mt-2 text-sm text-gray-500 text-center">
              IVA repercutido - IVA soportado
            </div>
          </CardContent>
        </Card>
        
        {/* IRPF Retenido */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white pb-3">
            <CardTitle className="flex items-center text-lg">
              <CreditCard className="mr-2" />
              IRPF Retenido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-center">
              —
            </div>
            <div className="mt-2 text-sm text-gray-500 text-center">
              Total IRPF acumulado
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator className="my-6" />
      
      <div className="text-center text-gray-500 text-sm">
        <p>Esta pantalla está preparada para mostrar los resultados fiscales en tiempo real.</p>
        <p className="mt-1">Próximamente: informes fiscales detallados y alertas de fechas importantes.</p>
      </div>
    </div>
  );
}