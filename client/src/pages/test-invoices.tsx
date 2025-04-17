import React, { useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// Interfaz para representar una factura de prueba
interface TestInvoice {
  id: number;
  base: number;
  ivaRate: number;
  irpfRate: number | null;
}

const TestInvoicesPage: React.FC = () => {
  // Facturas de prueba según los datos proporcionados
  const testInvoices: TestInvoice[] = [
    {
      id: 1,
      base: 1000,
      ivaRate: 21,
      irpfRate: 15,
    },
    {
      id: 2,
      base: 750,
      ivaRate: 10,
      irpfRate: null,
    },
    {
      id: 3,
      base: 250.75,
      ivaRate: 0,
      irpfRate: 7,
    },
    {
      id: 4,
      base: 1500,
      ivaRate: 21,
      irpfRate: 1,
    },
    {
      id: 5,
      base: 499.99,
      ivaRate: 4,
      irpfRate: null,
    },
  ];

  // Función para calcular el IVA
  const calculateIVA = (base: number, rate: number): number => {
    return (base * rate) / 100;
  };

  // Función para calcular el IRPF
  const calculateIRPF = (base: number, rate: number | null): number => {
    if (rate === null) return 0;
    return (base * rate) / 100;
  };

  // Función para calcular el total
  const calculateTotal = (base: number, iva: number, irpf: number): number => {
    return base + iva - irpf;
  };

  // Cálculo de los totales
  let totalBase = 0;
  let totalIVA = 0;
  let totalIRPF = 0;
  let totalNet = 0;

  testInvoices.forEach((invoice) => {
    totalBase += invoice.base;
    totalIVA += calculateIVA(invoice.base, invoice.ivaRate);
    totalIRPF += calculateIRPF(invoice.base, invoice.irpfRate);
    totalNet += calculateTotal(
      invoice.base,
      calculateIVA(invoice.base, invoice.ivaRate),
      calculateIRPF(invoice.base, invoice.irpfRate)
    );
  });

  // Formateo de números
  const formatNumber = (num: number): string => {
    return num.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Preparar datos para consola/JSON
  const invoiceResults = testInvoices.map(invoice => {
    const iva = calculateIVA(invoice.base, invoice.ivaRate);
    const irpf = calculateIRPF(invoice.base, invoice.irpfRate);
    const total = calculateTotal(invoice.base, iva, irpf);
    
    return {
      id: invoice.id,
      baseImponible: invoice.base,
      ivaRate: invoice.ivaRate,
      ivaAmount: iva,
      irpfRate: invoice.irpfRate,
      irpfAmount: irpf,
      total: total
    };
  });
  
  const totalResults = {
    totalBaseImponible: totalBase,
    totalIVA: totalIVA,
    totalIRPF: totalIRPF,
    totalNeto: totalNet
  };
  
  // Efecto para mostrar resultados en la consola
  useEffect(() => {
    console.log("=== RESULTADOS DE FACTURAS DE PRUEBA ===");
    invoiceResults.forEach(result => {
      console.log(`Factura ${result.id}:`);
      console.log(`- Base imponible: ${result.baseImponible.toFixed(2)}€`);
      console.log(`- IVA (${result.ivaRate}%): ${result.ivaAmount.toFixed(2)}€`);
      if (result.irpfRate) {
        console.log(`- IRPF (${result.irpfRate}%): -${result.irpfAmount.toFixed(2)}€`);
      }
      console.log(`- Total: ${result.total.toFixed(2)}€`);
      console.log("------------------------------------");
    });
    
    console.log("=== RESULTADOS TOTALES ===");
    console.log(`Total bases imponibles: ${totalBase.toFixed(2)}€`);
    console.log(`Total IVA repercutido: ${totalIVA.toFixed(2)}€`);
    console.log(`Total IRPF retenido: -${totalIRPF.toFixed(2)}€`);
    console.log(`Total neto emitido: ${totalNet.toFixed(2)}€`);
  }, []);

  // Función para mostrar respuesta completa en formato JSON para Mia
  const printResultsForMia = () => {
    const miaResponse = {
      facturas: invoiceResults.map(result => ({
        factura: result.id,
        base_imponible: result.baseImponible,
        iva_aplicado: {
          porcentaje: result.ivaRate,
          cantidad: parseFloat(result.ivaAmount.toFixed(2))
        },
        irpf_retenido: result.irpfRate ? {
          porcentaje: result.irpfRate,
          cantidad: parseFloat(result.irpfAmount.toFixed(2))
        } : null,
        total: parseFloat(result.total.toFixed(2))
      })),
      totales: {
        suma_bases_imponibles: parseFloat(totalBase.toFixed(2)),
        suma_iva_repercutido: parseFloat(totalIVA.toFixed(2)),
        suma_irpf_retenido: parseFloat(totalIRPF.toFixed(2)),
        total_neto_emitido: parseFloat(totalNet.toFixed(2))
      }
    };
    
    console.log("RESPUESTA PARA MIA:");
    console.log(JSON.stringify(miaResponse, null, 2));
    alert("Se ha generado la respuesta JSON para Mia en la consola.");
  };

  return (
    <div className="container mx-auto py-4">
      <PageHeader 
        title="Test de Cálculo de Facturas" 
        description="Verificación de cálculos para facturas emitidas en el libro de registros"
      />

      <div className="grid gap-6 mt-4">
        {testInvoices.map((invoice) => {
          const iva = calculateIVA(invoice.base, invoice.ivaRate);
          const irpf = calculateIRPF(invoice.base, invoice.irpfRate);
          const total = calculateTotal(invoice.base, iva, irpf);

          return (
            <Card key={invoice.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Factura {invoice.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Base imponible:</div>
                  <div className="text-sm font-medium text-right">{formatNumber(invoice.base)}€</div>
                  
                  <div className="text-sm text-muted-foreground">IVA ({invoice.ivaRate}%):</div>
                  <div className="text-sm font-medium text-right">{formatNumber(iva)}€</div>
                  
                  {invoice.irpfRate && (
                    <>
                      <div className="text-sm text-muted-foreground">IRPF ({invoice.irpfRate}%):</div>
                      <div className="text-sm font-medium text-right">-{formatNumber(irpf)}€</div>
                    </>
                  )}
                  
                  <Separator className="col-span-2 my-1" />
                  
                  <div className="text-sm font-semibold">Total:</div>
                  <div className="text-sm font-semibold text-right">{formatNumber(total)}€</div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card className="shadow-sm mt-4 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Resultados Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Suma total de bases imponibles:</div>
              <div className="text-sm font-medium text-right">{formatNumber(totalBase)}€</div>
              
              <div className="text-sm text-muted-foreground">Suma total del IVA repercutido:</div>
              <div className="text-sm font-medium text-right">{formatNumber(totalIVA)}€</div>
              
              <div className="text-sm text-muted-foreground">Suma total del IRPF retenido:</div>
              <div className="text-sm font-medium text-right">-{formatNumber(totalIRPF)}€</div>
              
              <Separator className="col-span-2 my-1" />
              
              <div className="text-sm font-semibold">Total neto emitido:</div>
              <div className="text-sm font-semibold text-right">{formatNumber(totalNet)}€</div>
              
              <div className="col-span-2 mt-4">
                <Button 
                  className="w-full" 
                  variant="outline" 
                  onClick={printResultsForMia}
                >
                  Generar respuesta JSON para Mia
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestInvoicesPage;