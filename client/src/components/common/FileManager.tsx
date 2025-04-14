import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Eye, Upload, File, FilePlus2 } from 'lucide-react';
import EnhancedFileUpload from './EnhancedFileUpload';
import { useToast } from '@/hooks/use-toast';
import { fileStorageService } from '@/lib/fileStorageService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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

interface FileManagerProps {
  entityType: 'expense' | 'invoice' | 'quote' | 'client' | 'company';
  entityId?: number;
  files: string[];
  onFilesChange: (files: string[]) => void;
  title?: string;
  description?: string;
  maxFiles?: number;
}

export default function FileManager({
  entityType,
  entityId,
  files,
  onFilesChange,
  title = "Archivos adjuntos",
  description = "Sube, visualiza y gestiona documentos",
  maxFiles = 5
}: FileManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileToPreview, setFileToPreview] = useState<string | null>(null);
  
  // Estado para el nuevo archivo subido
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Estado para la lista de archivos con metadata
  const [filesWithMetadata, setFilesWithMetadata] = useState<Array<{
    path: string;
    name: string;
    size: string;
    type: string;
    isImage: boolean;
  }>>([]);

  // Cargar información de los archivos
  useEffect(() => {
    const loadFileMetadata = async () => {
      if (files && files.length > 0) {
        try {
          setLoading(true);
          const filesData = await Promise.all(
            files.map(async (filePath) => {
              try {
                // Obtener metadata del archivo desde el servicio
                const metadata = await fileStorageService.getFileMetadata(filePath);
                const fileName = filePath.split('/').pop() || filePath;
                const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(metadata?.mimeType || '');
                
                return {
                  path: filePath,
                  name: metadata?.originalName || fileName,
                  size: metadata?.size 
                    ? `${(parseInt(metadata.size) / 1024).toFixed(1)} KB` 
                    : 'Desconocido',
                  type: metadata?.mimeType || 'application/octet-stream',
                  isImage
                };
              } catch (error) {
                console.error('Error al obtener metadata del archivo:', error);
                return {
                  path: filePath,
                  name: filePath.split('/').pop() || filePath,
                  size: 'Desconocido',
                  type: 'application/octet-stream',
                  isImage: false
                };
              }
            })
          );
          
          setFilesWithMetadata(filesData);
        } catch (error) {
          console.error('Error al cargar metadata de archivos:', error);
          toast({
            title: "Error",
            description: "No se pudieron cargar los detalles de los archivos",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      } else {
        setFilesWithMetadata([]);
      }
    };

    loadFileMetadata();
  }, [files, toast]);

  // Función para eliminar un archivo
  const handleDeleteFile = async (filePath: string) => {
    try {
      setLoading(true);
      
      // Llamar al servicio para eliminar el archivo
      await fileStorageService.deleteFile(filePath);
      
      // Actualizar el estado de los archivos
      const updatedFiles = files.filter(f => f !== filePath);
      onFilesChange(updatedFiles);
      
      toast({
        title: "Archivo eliminado",
        description: "El archivo ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error('Error al eliminar el archivo:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para descargar un archivo
  const handleDownloadFile = async (filePath: string) => {
    try {
      setLoading(true);
      
      // Llamar al servicio para descargar el archivo
      await fileStorageService.downloadFile(filePath);
      
      toast({
        title: "Descarga iniciada",
        description: "El archivo se está descargando",
      });
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para previsualizar un archivo
  const handlePreviewFile = async (filePath: string) => {
    try {
      setLoading(true);
      
      // Obtener la URL para previsualizar el archivo
      const url = await fileStorageService.getFilePreviewUrl(filePath);
      
      setPreviewUrl(url);
      setFileToPreview(filePath);
    } catch (error) {
      console.error('Error al previsualizar el archivo:', error);
      toast({
        title: "Error",
        description: "No se pudo previsualizar el archivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el archivo subido desde EnhancedFileUpload
  const handleFileAdded = (newFile: File) => {
    setUploadedFile(newFile);
  };

  // Función para subir el archivo
  const handleUploadFile = async () => {
    if (!uploadedFile) return;
    
    try {
      setLoading(true);
      
      // Crear un FormData para la subida
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('entityType', entityType);
      if (entityId) {
        formData.append('entityId', entityId.toString());
      }
      
      // Llamar al servicio para subir el archivo
      const uploadedFilePath = await fileStorageService.uploadFile(formData);
      
      // Actualizar el estado de los archivos
      const updatedFiles = [...files, uploadedFilePath];
      onFilesChange(updatedFiles);
      
      // Limpiar el estado de subida
      setUploadedFile(null);
      
      toast({
        title: "Archivo subido",
        description: "El archivo ha sido subido correctamente",
      });
    } catch (error) {
      console.error('Error al subir el archivo:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          {/* Título y descripción */}
          <div>
            <h3 className="text-lg font-medium">{title}</h3>
            {description && <p className="text-gray-500 text-sm">{description}</p>}
          </div>
          
          {/* Componente de carga de archivos */}
          {files.length < maxFiles && (
            <div className="space-y-3">
              <EnhancedFileUpload
                onFileAdded={handleFileAdded}
                maxSizeMB={5}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                label={`Arrastra y suelta archivos o haz clic aquí (${files.length}/${maxFiles})`}
              />
              
              {uploadedFile && (
                <div className="flex justify-between items-center bg-blue-50 p-2 rounded-md text-sm">
                  <div className="flex items-center">
                    <File className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="truncate max-w-[150px]">{uploadedFile.name}</span>
                    <span className="ml-2 text-gray-500 text-xs">
                      ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    onClick={handleUploadFile}
                    disabled={loading}
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Subir
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Lista de archivos */}
          <div className="mt-2">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <FilePlus2 className="h-4 w-4 mr-1 text-blue-500" />
              Archivos ({filesWithMetadata.length})
            </h4>
            
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Cargando archivos...</p>
              </div>
            ) : filesWithMetadata.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {filesWithMetadata.map((file, index) => (
                  <div key={index} className="flex justify-between items-center border rounded-md p-2 group hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        {file.isImage ? (
                          <img
                            src={fileStorageService.getFilePreviewUrlSync(file.path)}
                            alt="Thumbnail"
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <File className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate w-48">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.size} · {file.type.split('/')[1]}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      {/* Previsualizar */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handlePreviewFile(file.path)}
                          >
                            <Eye className="h-4 w-4 text-blue-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Previsualización: {file.name}</DialogTitle>
                            <DialogDescription>{file.size} · {file.type}</DialogDescription>
                          </DialogHeader>
                          
                          <div className="flex justify-center items-center p-4 bg-gray-50 rounded-md min-h-[300px]">
                            {file.isImage ? (
                              <img 
                                src={previewUrl || ''} 
                                alt={file.name} 
                                className="max-w-full max-h-[500px] object-contain" 
                              />
                            ) : (
                              <div className="text-center">
                                <File className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-600">Este tipo de archivo no puede previsualizarse directamente.</p>
                                <Button
                                  onClick={() => handleDownloadFile(file.path)}
                                  variant="outline"
                                  className="mt-4"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Descargar para ver
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="secondary">Cerrar</Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      {/* Descargar */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownloadFile(file.path)}
                      >
                        <Download className="h-4 w-4 text-green-500" />
                      </Button>
                      
                      {/* Eliminar */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El archivo será eliminado permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFile(file.path)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-md border border-dashed">
                <File className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No hay archivos adjuntos</p>
                <p className="text-xs text-gray-400 mt-1">Sube un archivo utilizando el formulario de arriba</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}