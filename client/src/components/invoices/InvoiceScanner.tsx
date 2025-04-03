import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertCircle, CheckCircle2, ScanLine, Upload, FileWarning, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';

interface ExtractedInvoice {
  numero_factura: string;
  fecha: string;
  emisor: {
    nombre: string;
    nif: string;
    direccion: string;
  };
  cliente: {
    nombre: string;
    nif: string;
    direccion: string;
  };
  concepto: string;
  base_imponible: number;
  iva: number;
  iva_rate?: number;
  irpf: number;
  irpf_rate?: number;
  total: number;
  metodo_pago: string;
  numero_cuenta?: string;
  errors?: string[];
}

interface ProcessResponse {
  message: string;
  extractedInvoice: ExtractedInvoice;
  invoice: any;
  warnings: string[];
  isValidSequence: boolean;
}

const InvoiceScanner = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultData, setResultData] = useState<ProcessResponse | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Función para manejar la selección de archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Crear vista previa para imágenes
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
      
      // Resetear datos previos
      setResultData(null);
    }
  };

  // Mutación para procesar la factura
  const processInvoiceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/invoices/process-document", undefined, formData);
      
      if (!response.ok) {
        throw new Error(`Error al procesar la factura: ${response.statusText}`);
      }
      
      return await response.json() as ProcessResponse;
    },
    onSuccess: (data) => {
      setResultData(data);
      
      // Si hay problemas con la secuencia, mostrar confirmación
      if (!data.isValidSequence) {
        setShowConfirmation(true);
      }
      
      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/recent"] });
      
      // Notificar al usuario
      toast({
        title: "Factura procesada correctamente",
        description: "Se ha extraído la información de la factura",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al procesar la factura",
        description: error.message,
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  // Función para procesar la factura
  const handleProcessInvoice = useCallback(async () => {
    if (!file) {
      toast({
        title: "No hay archivo seleccionado",
        description: "Por favor, seleccione un archivo para procesar.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      await processInvoiceMutation.mutateAsync(formData);
    } finally {
      setUploading(false);
    }
  }, [file, toast, processInvoiceMutation]);

  // Función para ir a la página de facturas
  const handleViewInvoice = useCallback(() => {
    if (resultData?.invoice?.id) {
      navigate(`/invoices/${resultData.invoice.id}`);
    } else {
      navigate('/invoices');
    }
  }, [resultData, navigate]);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a facturas
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escanear Factura</h1>
          <p className="text-muted-foreground">Sube una imagen o PDF de una factura para procesarla automáticamente</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {!resultData ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-blue-500" />
                Cargar Factura
              </CardTitle>
              <CardDescription>
                Sube una imagen JPG/PNG o un PDF de tu factura para extraer automáticamente sus datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-12">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                />
                
                {preview ? (
                  <div className="mb-4 max-h-64 overflow-hidden">
                    <img src={preview} alt="Vista previa" className="max-h-64 object-contain" />
                  </div>
                ) : (
                  <div className="mb-4 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-1 text-sm text-gray-500">Click para seleccionar o arrastra un archivo</p>
                  </div>
                )}
                
                <div className="mt-4">
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="cursor-pointer">
                      {file ? "Cambiar archivo" : "Seleccionar archivo"}
                    </Button>
                  </label>
                  {file && (
                    <span className="ml-3 text-sm text-gray-500">{file.name}</span>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button 
                onClick={handleProcessInvoice} 
                disabled={!file || uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ScanLine className="mr-2 h-4 w-4" />
                    Procesar Factura
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-4 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium flex items-center">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Factura Procesada Correctamente
                  </h3>
                  <Badge variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-0">
                    Factura Nº {resultData.extractedInvoice.numero_factura}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="pt-6">
                {/* Alertas de validación */}
                {!resultData.isValidSequence && (
                  <Alert className="mb-4 border-yellow-300 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Secuencia de numeración posiblemente incorrecta</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                      El número de esta factura podría no seguir la secuencia correcta con respecto a facturas anteriores.
                    </AlertDescription>
                  </Alert>
                )}
                
                {resultData.warnings && resultData.warnings.length > 0 && (
                  <Alert className="mb-4 border-yellow-300 bg-yellow-50">
                    <FileWarning className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Advertencias</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                      <ul className="list-disc pl-5 mt-2">
                        {resultData.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Información de la factura */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 text-blue-800">Información General</h4>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                      <dt className="col-span-1 font-medium text-gray-600">Nº Factura:</dt>
                      <dd className="col-span-2">{resultData.extractedInvoice.numero_factura}</dd>
                      
                      <dt className="col-span-1 font-medium text-gray-600">Fecha:</dt>
                      <dd className="col-span-2">{resultData.extractedInvoice.fecha}</dd>
                      
                      <dt className="col-span-1 font-medium text-gray-600">Concepto:</dt>
                      <dd className="col-span-2">{resultData.extractedInvoice.concepto}</dd>
                    </dl>
                    
                    <Separator className="my-4" />
                    
                    <h4 className="font-medium mb-3 text-blue-800">Importes</h4>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                      <dt className="col-span-1 font-medium text-gray-600">Base Imponible:</dt>
                      <dd className="col-span-2">{formatCurrency(resultData.extractedInvoice.base_imponible)}</dd>
                      
                      <dt className="col-span-1 font-medium text-gray-600">IVA{resultData.extractedInvoice.iva_rate ? ` (${resultData.extractedInvoice.iva_rate}%)` : ''}:</dt>
                      <dd className="col-span-2">{formatCurrency(resultData.extractedInvoice.iva)}</dd>
                      
                      {resultData.extractedInvoice.irpf !== 0 && (
                        <>
                          <dt className="col-span-1 font-medium text-gray-600">IRPF{resultData.extractedInvoice.irpf_rate ? ` (${resultData.extractedInvoice.irpf_rate}%)` : ''}:</dt>
                          <dd className="col-span-2">{formatCurrency(resultData.extractedInvoice.irpf)}</dd>
                        </>
                      )}
                      
                      <dt className="col-span-1 font-medium text-gray-600">Total:</dt>
                      <dd className="col-span-2 font-bold">{formatCurrency(resultData.extractedInvoice.total)}</dd>
                    </dl>
                    
                    <Separator className="my-4" />
                    
                    <h4 className="font-medium mb-3 text-blue-800">Pago</h4>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                      <dt className="col-span-1 font-medium text-gray-600">Método:</dt>
                      <dd className="col-span-2">{resultData.extractedInvoice.metodo_pago}</dd>
                      
                      {resultData.extractedInvoice.numero_cuenta && (
                        <>
                          <dt className="col-span-1 font-medium text-gray-600">Cuenta:</dt>
                          <dd className="col-span-2 font-mono">{resultData.extractedInvoice.numero_cuenta}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                  
                  <div>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="emisor">
                        <AccordionTrigger className="text-blue-800">Datos del Emisor</AccordionTrigger>
                        <AccordionContent>
                          <dl className="space-y-2 text-sm">
                            <dt className="font-medium text-gray-600">Nombre:</dt>
                            <dd>{resultData.extractedInvoice.emisor.nombre || "No detectado"}</dd>
                            
                            <dt className="font-medium text-gray-600">NIF/CIF:</dt>
                            <dd>{resultData.extractedInvoice.emisor.nif || "No detectado"}</dd>
                            
                            <dt className="font-medium text-gray-600">Dirección:</dt>
                            <dd>{resultData.extractedInvoice.emisor.direccion || "No detectada"}</dd>
                          </dl>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="cliente">
                        <AccordionTrigger className="text-blue-800">Datos del Cliente</AccordionTrigger>
                        <AccordionContent>
                          <dl className="space-y-2 text-sm">
                            <dt className="font-medium text-gray-600">Nombre:</dt>
                            <dd>{resultData.extractedInvoice.cliente.nombre}</dd>
                            
                            <dt className="font-medium text-gray-600">NIF/CIF:</dt>
                            <dd>{resultData.extractedInvoice.cliente.nif}</dd>
                            
                            <dt className="font-medium text-gray-600">Dirección:</dt>
                            <dd>{resultData.extractedInvoice.cliente.direccion}</dd>
                          </dl>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={() => setResultData(null)}>
                  Escanear Otra
                </Button>
                <Button 
                  onClick={handleViewInvoice}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Ver Factura
                </Button>
              </CardFooter>
            </Card>
          </>
        )}
      </div>
      
      {/* Diálogo de confirmación para secuencia incorrecta */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¡Atención! Secuencia de factura incorrecta</AlertDialogTitle>
            <AlertDialogDescription>
              El número de factura no sigue la secuencia correcta. Las facturas deben tener números consecutivos.
              <br /><br />
              La factura se ha creado con el número {resultData?.extractedInvoice.numero_factura}, pero podrías tener problemas con la contabilidad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleViewInvoice}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Ver Factura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvoiceScanner;