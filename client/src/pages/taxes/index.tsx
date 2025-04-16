import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Info } from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";

// Componente para mostrar información de impuestos
export default function TaxesPage() {
  const [location, navigate] = useLocation();
  
  // Obtener datos de impuestos del dashboard (usamos la misma API)
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });

  // Función para calcular el período actual (trimestre)
  const getCurrentPeriod = () => {
    const date = new Date();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const year = date.getFullYear();
    return `${quarter}T ${year}`;
  };

  // Función para formatear fechas de vencimiento
  const getDueDate = (quarter: number) => {
    const year = new Date().getFullYear();
    const month = quarter * 3;
    // 20 días después del final de cada trimestre
    return new Date(year, month, 20);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const taxStats = stats?.taxStats || {
    ivaRepercutido: 0,
    ivaSoportado: 0,
    ivaLiquidar: 0,
    irpfRetenido: 0,
    irpfTotal: 0,
    irpfPagar: 0,
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Resumen de Impuestos</h1>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar datos
        </Button>
      </div>

      <Tabs defaultValue="iva" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="iva">IVA</TabsTrigger>
          <TabsTrigger value="irpf">IRPF</TabsTrigger>
        </TabsList>

        <TabsContent value="iva">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>IVA del Período Actual ({getCurrentPeriod()})</CardTitle>
                <CardDescription>
                  Vencimiento: {getDueDate(Math.ceil((new Date().getMonth() + 1) / 3)).toLocaleDateString("es-ES")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">IVA Repercutido:</span>
                    <span className="font-semibold">{formatCurrency(taxStats.ivaRepercutido)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">IVA Soportado:</span>
                    <span className="font-semibold">{formatCurrency(taxStats.ivaSoportado)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">IVA a Liquidar:</span>
                    <span className="font-bold text-lg text-emerald-600">
                      {formatCurrency(taxStats.ivaLiquidar)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolución IVA Anual</CardTitle>
                <CardDescription>
                  Resumen del año {new Date().getFullYear()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Info className="h-4 w-4 mr-2" />
                    <span>
                      Los datos presentados son una estimación basada en la información actual.
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">1T:</span>
                    <span className="font-semibold">{formatCurrency(taxStats.ivaLiquidar / 4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">2T:</span>
                    <span className="font-semibold">{formatCurrency(taxStats.ivaLiquidar / 4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">3T:</span>
                    <span className="font-semibold">{formatCurrency(taxStats.ivaLiquidar / 4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">4T:</span>
                    <span className="font-semibold">{formatCurrency(taxStats.ivaLiquidar / 4)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Anual:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(taxStats.ivaLiquidar)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="irpf">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>IRPF del Período Actual</CardTitle>
                <CardDescription>
                  Pagos a cuenta trimestrales (Modelo 130)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">IRPF Retenido:</span>
                    <span className="font-semibold">{formatCurrency(taxStats.irpfRetenido)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">IRPF Estimado Total:</span>
                    <span className="font-semibold">{formatCurrency(taxStats.irpfTotal)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">IRPF a pagar (estimado):</span>
                    <span className="font-bold text-lg text-emerald-600">
                      {formatCurrency(taxStats.irpfPagar)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información Adicional</CardTitle>
                <CardDescription>
                  Sobre el cálculo de impuestos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-gray-600">
                  <p>
                    <strong>IVA:</strong> El Impuesto sobre el Valor Añadido se calcula como la diferencia entre el IVA 
                    repercutido (cobrado a clientes) y el IVA soportado (pagado a proveedores).
                  </p>
                  <p>
                    <strong>IRPF:</strong> El Impuesto sobre la Renta de las Personas Físicas para autónomos se basa en
                    los rendimientos netos de la actividad. Las retenciones en facturas emitidas se descuentan
                    del impuesto final a pagar.
                  </p>
                  <p className="text-amber-600 font-medium">
                    Esta información es orientativa. Consulta con tu asesor fiscal para cálculos definitivos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}