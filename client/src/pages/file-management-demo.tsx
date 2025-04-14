import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import FileManager from '@/components/common/FileManager';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, Database, File, HardDrive, List } from 'lucide-react';

export default function FileManagementDemo() {
  const { toast } = useToast();
  const [expenseFiles, setExpenseFiles] = useState<string[]>([]);
  const [invoiceFiles, setInvoiceFiles] = useState<string[]>([]);
  const [quoteFiles, setQuoteFiles] = useState<string[]>([]);

  // Simular que estamos demostrando para un gasto específico
  const demoExpenseId = 123;
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Gestión de Archivos</h1>
      <p className="text-center mb-8 text-gray-600 max-w-2xl mx-auto">
        Este es un ejemplo de cómo funciona el nuevo sistema de gestión de archivos. 
        Puede subir archivos, verlos, descargarlos y eliminarlos asociados a diferentes entidades.
      </p>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Columna Izquierda - Demo de FileManager */}
        <div className="space-y-6">
          <Tabs defaultValue="expense" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="expense">Gastos</TabsTrigger>
              <TabsTrigger value="invoice">Facturas</TabsTrigger>
              <TabsTrigger value="quote">Presupuestos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="expense">
              <FileManager
                entityType="expense"
                entityId={demoExpenseId}
                files={expenseFiles}
                onFilesChange={setExpenseFiles}
                title="Archivos de Gastos"
                description="Sube y gestiona documentos relacionados con este gasto"
              />
            </TabsContent>
            
            <TabsContent value="invoice">
              <FileManager
                entityType="invoice"
                files={invoiceFiles}
                onFilesChange={setInvoiceFiles}
                title="Archivos de Facturas"
                description="Sube y gestiona documentos relacionados con esta factura"
              />
            </TabsContent>
            
            <TabsContent value="quote">
              <FileManager
                entityType="quote"
                files={quoteFiles}
                onFilesChange={setQuoteFiles}
                title="Archivos de Presupuestos"
                description="Sube y gestiona documentos relacionados con este presupuesto"
              />
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Archivos Subidos</CardTitle>
              <CardDescription>Estado actual de los archivos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium flex items-center mb-2">
                    <File className="mr-2 h-4 w-4 text-blue-500" />
                    Gastos ({expenseFiles.length})
                  </h3>
                  {expenseFiles.length > 0 ? (
                    <ul className="text-sm space-y-1 ml-6 list-disc">
                      {expenseFiles.map((file, index) => (
                        <li key={index}>{file.split('/').pop()}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No hay archivos</p>
                  )}
                </div>

                <div>
                  <h3 className="font-medium flex items-center mb-2">
                    <File className="mr-2 h-4 w-4 text-green-500" />
                    Facturas ({invoiceFiles.length})
                  </h3>
                  {invoiceFiles.length > 0 ? (
                    <ul className="text-sm space-y-1 ml-6 list-disc">
                      {invoiceFiles.map((file, index) => (
                        <li key={index}>{file.split('/').pop()}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No hay archivos</p>
                  )}
                </div>

                <div>
                  <h3 className="font-medium flex items-center mb-2">
                    <File className="mr-2 h-4 w-4 text-amber-500" />
                    Presupuestos ({quoteFiles.length})
                  </h3>
                  {quoteFiles.length > 0 ? (
                    <ul className="text-sm space-y-1 ml-6 list-disc">
                      {quoteFiles.map((file, index) => (
                        <li key={index}>{file.split('/').pop()}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No hay archivos</p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => {
                  toast({
                    title: "Datos actualizados",
                    description: `Total archivos: ${expenseFiles.length + invoiceFiles.length + quoteFiles.length}`,
                  });
                }}
              >
                <HardDrive className="mr-2 h-4 w-4" />
                Actualizar conteo
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Columna Derecha - Información del Sistema */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5 text-blue-500" />
                Sobre el Sistema de Archivos
              </CardTitle>
              <CardDescription>
                Características principales del nuevo sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                <h3 className="font-medium text-blue-700 mb-2">Características</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="bg-blue-500 rounded-full h-5 w-5 flex items-center justify-center text-white text-xs mr-3 mt-0.5">✓</span>
                    <span>Almacenamiento gratuito local para archivos pequeños</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-500 rounded-full h-5 w-5 flex items-center justify-center text-white text-xs mr-3 mt-0.5">✓</span>
                    <span>Soporte para imágenes, PDF y documentos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-500 rounded-full h-5 w-5 flex items-center justify-center text-white text-xs mr-3 mt-0.5">✓</span>
                    <span>Asociación con gastos, facturas y presupuestos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-500 rounded-full h-5 w-5 flex items-center justify-center text-white text-xs mr-3 mt-0.5">✓</span>
                    <span>Previsualización y descarga directa</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-500 rounded-full h-5 w-5 flex items-center justify-center text-white text-xs mr-3 mt-0.5">✓</span>
                    <span>Seguridad con acceso solo a usuarios autorizados</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                <h3 className="font-medium text-blue-700 mb-2">Límites</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Tamaño máximo por archivo</span>
                      <span className="text-sm font-medium">5 MB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Tipos de archivo permitidos</span>
                      <span className="text-sm font-medium">JPG, PNG, PDF, DOC</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Máximo archivos por entidad</span>
                      <span className="text-sm font-medium">5 archivos</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="default"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  toast({
                    title: "Sistema activado",
                    description: "El sistema de gestión de archivos está listo para usar",
                  });
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Probar subida de archivo
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Instrucciones de uso</CardTitle>
              <CardDescription>Cómo integrar el sistema en la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md border text-sm font-mono overflow-auto">
                <pre>{`// Importar el componente
import FileManager from '@/components/common/FileManager';

// Usar en un componente
export function MyComponent() {
  const [files, setFiles] = useState<string[]>([]);
  
  return (
    <FileManager
      entityType="expense"
      entityId={123}
      files={files}
      onFilesChange={setFiles}
    />
  );
}`}</pre>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="entity-type">Tipo de entidad:</Label>
                <Input id="entity-type" value="expense | invoice | quote | client | company" readOnly />
                
                <Label htmlFor="entity-id">ID de la entidad (opcional):</Label>
                <Input id="entity-id" value="Número entero que identifica la entidad" readOnly />
                
                <Label htmlFor="files-prop">Propiedad files:</Label>
                <Input id="files-prop" value="Array de strings con las rutas de los archivos" readOnly />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <List className="mr-2 h-4 w-4" />
                Ver documentación completa
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}