import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedFileUpload, { FileData } from './EnhancedFileUpload';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

interface FileManagerProps {
  entityType: 'expense' | 'invoice' | 'quote' | 'client' | 'company';
  entityId?: number;
  files: string[];
  onFilesChange: (files: string[]) => void;
  title?: string;
  description?: string;
  maxFiles?: number;
}

const FileManager: React.FC<FileManagerProps> = ({
  entityType,
  entityId,
  files = [],
  onFilesChange,
  title = 'Archivos adjuntos',
  description = 'Sube y gestiona archivos relacionados con este registro',
  maxFiles = 5
}) => {
  const { toast } = useToast();
  const [fileList, setFileList] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Convertir los archivos de cadenas a objetos FileData
  useEffect(() => {
    const convertedFiles: FileData[] = files.map(path => ({ path }));
    setFileList(convertedFiles);
  }, [files]);

  // Manejar adición de un nuevo archivo
  const handleFileAdded = (newFile: FileData) => {
    const updatedFiles = [...fileList, newFile];
    setFileList(updatedFiles);
    
    // Notificar al componente padre con las rutas de archivos
    const filePaths = updatedFiles.map(file => file.path);
    onFilesChange(filePaths);
  };

  // Manejar eliminación de un archivo
  const handleFileRemoved = (filePath: string) => {
    const updatedFiles = fileList.filter(file => file.path !== filePath);
    setFileList(updatedFiles);
    
    // Notificar al componente padre con las rutas de archivos
    const filePaths = updatedFiles.map(file => file.path);
    onFilesChange(filePaths);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="view" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view">Ver archivos</TabsTrigger>
            <TabsTrigger value="upload">Subir archivo</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view" className="space-y-4">
            {fileList.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                No hay archivos adjuntos
              </div>
            ) : (
              <div>
                <EnhancedFileUpload
                  files={fileList}
                  onFileAdded={handleFileAdded}
                  onFileRemoved={handleFileRemoved}
                  showPreview={true}
                  entityType={entityType}
                  entityId={entityId}
                  maxFiles={maxFiles}
                />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upload">
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Selecciona un archivo para subir. Se aceptan imágenes (JPG, PNG), 
                documentos PDF y archivos de Word.
              </p>
              
              <EnhancedFileUpload
                files={fileList}
                onFileAdded={handleFileAdded}
                onFileRemoved={handleFileRemoved}
                buttonLabel="Seleccionar archivo para subir"
                buttonClassName="w-full"
                entityType={entityType}
                entityId={entityId}
                maxFiles={maxFiles}
              />
              
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-gray-500">
                  Límite por archivo: 5 MB. 
                  Máximo {maxFiles} archivos por {entityType === 'expense' ? 'gasto' : 
                    entityType === 'invoice' ? 'factura' : 
                    entityType === 'quote' ? 'presupuesto' : 'registro'}.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm"
          disabled={isLoading}
          onClick={() => {
            setIsLoading(true);
            // Simulación de actualización
            setTimeout(() => {
              setIsLoading(false);
              toast({
                title: "Archivos actualizados",
                description: "La lista de archivos se ha actualizado correctamente"
              });
            }, 500);
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar lista
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileManager;