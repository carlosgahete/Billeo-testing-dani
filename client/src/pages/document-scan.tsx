import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Image, Receipt, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DocumentScanPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);

    // Solo crear preview para imágenes
    if (selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un archivo para procesar",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/process", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      setExtractedData(data.extractedData);
      setTransaction(data.transaction);
      
      toast({
        title: "Documento procesado",
        description: "El documento se ha procesado correctamente y se ha creado un gasto",
      });
    } catch (error: any) {
      toast({
        title: "Error al procesar el documento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGoToTransactions = () => {
    navigate("/transactions");
  };

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Escanear documento</h1>
          <p className="text-muted-foreground">
            Sube una factura o recibo para procesarlo automáticamente
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subir documento</CardTitle>
            <CardDescription>
              Sube un documento para extraer automáticamente sus datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="document-upload">Documento</Label>
                <Input
                  id="document-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Formatos soportados: PDF, JPG, PNG
                </p>
              </div>

              {previewUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Vista previa:</p>
                  <div className="border rounded-md overflow-hidden w-full max-h-[300px] flex items-center justify-center">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-w-full max-h-[300px] object-contain" 
                    />
                  </div>
                </div>
              )}

              {fileName && !previewUrl && (
                <div className="mt-4 flex items-center text-sm border rounded-md p-3">
                  <FileText className="h-5 w-5 mr-2 text-neutral-500" />
                  <span className="text-neutral-700">{fileName}</span>
                </div>
              )}

              <Button 
                onClick={handleUpload} 
                disabled={!file || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Procesar documento
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              Datos extraídos del documento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!extractedData && !transaction ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                <p>Los datos extraídos aparecerán aquí al procesar un documento</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-lg mb-3">Datos extraídos</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span>{new Date(extractedData.date).toLocaleDateString('es-ES')}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Descripción:</span>
                      <span>{extractedData.description}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Importe:</span>
                      <span className="font-medium">{extractedData.amount.toFixed(2)} €</span>
                    </div>
                    {extractedData.taxAmount > 0 && (
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">IVA (estimado):</span>
                        <span>{extractedData.taxAmount.toFixed(2)} €</span>
                      </div>
                    )}
                    {extractedData.vendor && (
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Proveedor:</span>
                        <span>{extractedData.vendor}</span>
                      </div>
                    )}
                    {extractedData.categoryHint && (
                      <div className="flex justify-between pb-2">
                        <span className="text-muted-foreground">Categoría sugerida:</span>
                        <span>{extractedData.categoryHint}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium text-lg mb-3">Transacción creada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Se ha creado automáticamente la siguiente transacción:
                  </p>
                  
                  <div className="bg-neutral-50 rounded-md p-3 text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Descripción:</span>
                      <span>{transaction.description}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Importe:</span>
                      <span>{Number(transaction.amount).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Tipo:</span>
                      <span>Gasto</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Fecha:</span>
                      <span>{new Date(transaction.date).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleGoToTransactions}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    Ver en Ingresos y Gastos
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DocumentScanPage;