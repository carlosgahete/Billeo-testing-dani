import React, { useCallback, useState } from "react";
import { Upload, Check, X, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FileUploaderProps {
  onFileUploaded?: (path: string) => void;
  allowedTypes?: string[];
  maxSize?: number; // en MB
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileUploaded,
  allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  maxSize = 5, // 5MB por defecto
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [onFileUploaded, allowedTypes, maxSize]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validar tipo de archivo
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo no permitido",
        description: `Solo se permiten archivos: ${allowedTypes.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: `El tamaño máximo permitido es ${maxSize}MB`,
        variant: "destructive",
      });
      return;
    }

    // Comenzar la carga
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("idle");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simular progreso de carga para mejor UX
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + 10;
          return next < 90 ? next : prev;
        });
      }, 300);

      // Hacer la carga a través de la API
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();

      clearInterval(interval);
      setUploadProgress(100);
      setUploadStatus("success");

      // Callback al componente padre con la ruta del archivo
      if (onFileUploaded && responseData.path) {
        onFileUploaded(responseData.path);
      }

      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente",
      });
    } catch (error) {
      setUploadStatus("error");
      toast({
        title: "Error al subir",
        description: "No se pudo subir el archivo. Inténtalo de nuevo.",
        variant: "destructive",
      });
      console.error("Error al subir archivo:", error);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus("idle");
      }, 2000);
    }
  };

  return (
    <Card
      className={`border-dashed ${
        isDragging ? "border-primary bg-muted/20" : "border-muted-foreground/20"
      } ${className}`}
    >
      <CardContent
        className="flex flex-col items-center justify-center p-6 text-center"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Subiendo...</span>
              <span className="text-sm">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full">
              <div
                className={`h-full rounded-full ${
                  uploadStatus === "error" ? "bg-red-500" : "bg-primary"
                }`}
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            {uploadStatus === "success" && (
              <div className="flex items-center mt-2 text-green-500">
                <Check className="w-4 h-4 mr-1" />
                <span className="text-sm">Archivo subido correctamente</span>
              </div>
            )}
            {uploadStatus === "error" && (
              <div className="flex items-center mt-2 text-red-500">
                <X className="w-4 h-4 mr-1" />
                <span className="text-sm">Error al subir el archivo</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <FileText className="w-10 h-10 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Adjuntar documento</h3>
              <p className="text-sm text-muted-foreground">
                Arrastra y suelta tu archivo aquí, o haz clic para seleccionarlo
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, JPG o PNG (Máx. {maxSize}MB)
              </p>
            </div>
            <div className="mt-4">
              <label htmlFor="file-upload">
                <Button variant="secondary" className="cursor-pointer" asChild>
                  <div className="flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    <span>Seleccionar archivo</span>
                  </div>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept={allowedTypes.join(",")}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};