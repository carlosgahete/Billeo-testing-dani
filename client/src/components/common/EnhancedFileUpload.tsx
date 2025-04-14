import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Upload, Camera, FileText, X, ExternalLink, Download, Eye, Trash2 } from "lucide-react";
import { 
  uploadFile, 
  viewFile, 
  downloadFile, 
  FileMetadata,
  getPreviewUrl,
  isImageFile,
  isPdfFile,
  formatFileSize
} from "@/lib/fileStorageService";

export interface FileData {
  path: string;
  metadata?: FileMetadata;
}

interface EnhancedFileUploadProps {
  files: FileData[];
  onFileAdded: (fileData: FileData) => void;
  onFileRemoved: (filePath: string) => void;
  accept?: string;
  compact?: boolean;
  buttonLabel?: string;
  buttonClassName?: string;
  showPreview?: boolean;
  entityType?: 'expense' | 'invoice' | 'quote' | 'client' | 'company';
  entityId?: number;
  maxFiles?: number;
}

const EnhancedFileUpload = ({ 
  files = [],
  onFileAdded,
  onFileRemoved,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  compact = false,
  buttonLabel,
  buttonClassName,
  showPreview = true,
  entityType,
  entityId,
  maxFiles = 5
}: EnhancedFileUploadProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  
  // Efecto para generar URLs de vista previa para imágenes
  useEffect(() => {
    const newPreviewUrls: Record<string, string> = {};
    
    files.forEach(file => {
      if (file.path && (file.metadata?.fileType === 'image' || isImageFile(file.path))) {
        newPreviewUrls[file.path] = getPreviewUrl(file.path);
      }
    });
    
    setPreviewUrls(newPreviewUrls);
  }, [files]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Verificar límite de archivos
    if (files.length >= maxFiles) {
      toast({
        title: "Límite de archivos alcanzado",
        description: `Solo puede subir hasta ${maxFiles} archivos.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const fileMetadata = await uploadFile(selectedFile, entityType, entityId);
      
      if (fileMetadata) {
        // Notificar al componente padre
        onFileAdded({
          path: fileMetadata.path,
          metadata: fileMetadata
        });
        
        if (!compact) {
          toast({
            title: "Archivo subido",
            description: "El archivo se ha subido correctamente",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error al subir el archivo",
        description: error.message || 'Ha ocurrido un error al subir el archivo',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  };
  
  const handleViewFile = (filePath: string) => {
    viewFile(filePath);
  };
  
  const handleDownloadFile = (filePath: string, customName?: string) => {
    downloadFile(filePath, customName);
  };
  
  const handleRemoveFile = (filePath: string) => {
    onFileRemoved(filePath);
  };
  
  return (
    <div>
      <div className="flex items-center mb-2">
        <Input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading || files.length >= maxFiles}
          className="hidden"
          id="enhanced-file-upload"
        />
        <label htmlFor="enhanced-file-upload">
          <Button
            type="button"
            variant={compact ? "ghost" : "outline"}
            size="sm"
            disabled={isUploading || files.length >= maxFiles}
            className={`cursor-pointer whitespace-nowrap ${compact ? 'px-2 h-8' : ''} ${buttonClassName || ''}`}
            onClick={() => document.getElementById("enhanced-file-upload")?.click()}
          >
            {compact ? (
              <>
                <Paperclip className="h-4 w-4" />
                {isUploading && <span className="ml-1 text-xs">...</span>}
              </>
            ) : (
              <>
                {accept.includes(".jpg") || accept.includes(".png") ? (
                  <Camera className="h-4 w-4 mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? "Subiendo..." : (buttonLabel || `Subir archivo${files.length >= maxFiles ? ' (máx. alcanzado)' : ''}`)}
              </>
            )}
          </Button>
        </label>
      </div>
      
      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="mt-2 space-y-2">
          {files.map((file, index) => {
            const fileName = file.path.split('/').pop() || 'archivo';
            const fileSize = file.metadata?.size ? formatFileSize(file.metadata.size) : '';
            const isImage = file.metadata?.fileType === 'image' || isImageFile(file.path);
            const isPdf = file.metadata?.fileType === 'pdf' || isPdfFile(file.path);
            
            return (
              <div 
                key={index} 
                className="flex flex-col border border-gray-200 rounded-md overflow-hidden bg-white"
              >
                {/* Vista previa si es una imagen y showPreview está activado */}
                {showPreview && isImage && previewUrls[file.path] && (
                  <div className="relative w-full h-32 bg-gray-100 border-b border-gray-200">
                    <img 
                      src={previewUrls[file.path]} 
                      alt={fileName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                
                {/* Vista previa si es un PDF */}
                {showPreview && isPdf && (
                  <div className="relative w-full h-20 bg-gray-100 border-b border-gray-200 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-red-500" />
                  </div>
                )}
                
                {/* Información del archivo y acciones */}
                <div className="p-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {!showPreview && (
                      <>
                        {isImage ? (
                          <Camera className="h-4 w-4 flex-shrink-0 text-blue-500" />
                        ) : isPdf ? (
                          <FileText className="h-4 w-4 flex-shrink-0 text-red-500" />
                        ) : (
                          <Paperclip className="h-4 w-4 flex-shrink-0 text-gray-500" />
                        )}
                      </>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">
                        {file.metadata?.originalName || fileName}
                      </p>
                      {fileSize && (
                        <p className="text-xs text-gray-500">{fileSize}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewFile(file.path)}
                      className="h-8 w-8 p-0"
                      title="Ver archivo"
                    >
                      <Eye className="h-4 w-4 text-blue-500" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadFile(file.path)}
                      className="h-8 w-8 p-0"
                      title="Descargar archivo"
                    >
                      <Download className="h-4 w-4 text-green-500" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(file.path)}
                      className="h-8 w-8 p-0"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EnhancedFileUpload;