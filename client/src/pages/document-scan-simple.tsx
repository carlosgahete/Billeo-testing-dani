import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Receipt, ZoomIn, ZoomOut, X, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

// Importar nuestro componente para la edición de documentos
import SimpleEditForm from "@/components/documents/SimpleEditForm";

// Esquema para validar la categoría
const categorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["income", "expense"]),
  color: z.string().default("#6E56CF"),
  icon: z.string().default("💼"), // Icono predeterminado
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// Tipo para categorías
interface Category {
  id: number;
  userId: number;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string; // Icono opcional
}

const DocumentScanPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [isResultZoomed, setIsResultZoomed] = useState(false);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [showEditMode, setShowEditMode] = useState(false);
  
  // Consulta para obtener categorías
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  
  // Hook para el formulario de nueva categoría
  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense", // Por defecto para gastos
      color: "#6E56CF",
      icon: "💼", // Icono predeterminado
    },
  });

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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    
    setFile(droppedFile);
    setFileName(droppedFile.name);
    
    // Solo crear preview para imágenes
    if (droppedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(droppedFile);
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
      setDocumentImage(data.documentUrl || null);
      
      // Ir directamente a edición sin mostrar el diálogo de confirmación
      setShowEditMode(true);
      
      toast({
        title: "Documento procesado",
        description: "El documento se ha procesado correctamente. Revisa los datos para guardarlos.",
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

  // Función para guardar cambios y navegar a la lista de transacciones
  const handleGoToTransactions = () => {
    navigate("/transactions");
  };
  
  // Efecto para reiniciar los estados cuando se carga la página
  useEffect(() => {
    // Limpiar estados al montar el componente
    setFile(null);
    setFileName("");
    setPreviewUrl(null);
    setExtractedData(null);
    setTransaction(null);
    setDocumentImage(null);
    
    // Función de limpieza cuando se desmonta el componente
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);
  
  // Mutación para crear una nueva categoría
  const handleCreateCategory = async (data: CategoryFormValues) => {
    try {
      const response = await apiRequest("POST", "/api/categories", data);
      const newCategory = await response.json();
      
      toast({
        title: "Categoría creada",
        description: `La categoría ${newCategory.name} se ha creado correctamente`,
      });
      
      // Cerrar el modal
      setNewCategoryDialogOpen(false);
      
      // Refrescar la lista de categorías
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      
      // Resetear formulario
      categoryForm.reset({
        name: "",
        type: "expense",
        color: "#6E56CF",
        icon: "💼",
      });
      
      // Actualizar la categoría del documento
      if (transaction && newCategory.id) {
        handleUpdateCategory(String(newCategory.id));
      }
    } catch (error: any) {
      toast({
        title: "Error al crear la categoría",
        description: "No se pudo crear la categoría. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };
  
  // Función para actualizar la categoría de la transacción
  const handleUpdateCategory = async (categoryId: string | null) => {
    if (!transaction) return;
    
    // Convertir string a number o null
    const numericCategoryId = categoryId === "null" ? null : 
                              categoryId ? parseInt(categoryId) : null;
    
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...transaction,
          categoryId: numericCategoryId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Actualizar la transacción en el estado
      setTransaction({
        ...transaction,
        categoryId: numericCategoryId
      });
      
      // Invalidar consultas
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      
      toast({
        title: "Categoría actualizada",
        description: "La categoría del gasto se ha actualizado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error al actualizar la categoría",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  // Función para guardar los cambios realizados
  const handleSaveChanges = async () => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    
    toast({
      title: "Cambios guardados",
      description: "Los cambios en el gasto se han guardado correctamente",
    });
  };
  
  // Manejador para el envío del formulario de categoría
  const onSubmitCategory = (data: CategoryFormValues) => {
    handleCreateCategory(data);
  };
  
  return (
    <div className="h-screen w-full flex items-center justify-center">
      {/* Botón flotante minimalista para volver en móvil */}
      <div className="sm:hidden fixed top-2 left-2 z-10">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/transactions")} 
          className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4 text-[#007AFF]" />
        </Button>
      </div>
      
      {/* Contenedor principal exactamente en el centro de la pantalla */}
      <div 
        className="w-full max-w-[370px] px-4"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }}
      >
        
        {/* Control de archivos invisible */}
        <input
          type="file"
          id="file-input"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
          capture="environment"
        />

        {!showEditMode ? (
          // Modo de subida de documento
          <div className="w-full">
            {/* Zona de arrastrar y soltar - versión simple para móvil al estilo Apple */}
            <div 
              className="w-full border border-gray-100 rounded-3xl py-8 px-6 text-center bg-white shadow-sm cursor-pointer"
              style={{
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {/* Icono con diseño Apple */}
              <div className="mx-auto h-16 w-16 rounded-full bg-[#4285F4] flex items-center justify-center">
                <Upload className="h-8 w-8 text-white" />
              </div>
              
              <p className="text-base font-medium text-gray-900 mt-4">
                <span className="hidden sm:inline">Arrastra y suelta o haz clic para subir</span>
                <span className="sm:hidden">Toca para subir factura</span>
              </p>
              
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG, PDF
              </p>
              
              {fileName && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-[#007AFF] bg-blue-50">
                    {fileName}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Vista previa si es una imagen */}
            {previewUrl && (
              <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-gray-50">
                <h3 className="font-medium text-gray-700 mb-2">Vista previa</h3>
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="Vista previa" 
                    className="w-full h-48 object-contain rounded-lg" 
                  />
                </div>
              </div>
            )}
            
            {/* Botón de procesamiento exactamente como en la imagen de referencia */}
            <div className="mt-6">
              <Button 
                onClick={handleUpload} 
                disabled={!file || uploading}
                className={`relative rounded-full py-2 px-8 text-sm font-normal w-full 
                  ${uploading || !file 
                    ? "bg-gray-200/80 text-gray-400" 
                    : "bg-gray-200/80 text-gray-500"
                  }`}
                variant="ghost"
              >
                {uploading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Procesar</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Modo de edición
          <div className="w-full max-w-[500px] bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            {/* Imagen del documento escaneado */}
            {documentImage && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-sm text-gray-800 flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-[#007AFF]" />
                    Documento escaneado
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsResultZoomed(!isResultZoomed)}
                    className="h-7 px-2 text-xs rounded-full hover:bg-blue-50 hover:text-[#007AFF] transition-colors"
                  >
                    {isResultZoomed ? (
                      <>
                        <ZoomOut className="h-3 w-3 mr-1" />
                        Reducir
                      </>
                    ) : (
                      <>
                        <ZoomIn className="h-3 w-3 mr-1" />
                        Ampliar
                      </>
                    )}
                  </Button>
                </div>
                <div className="border border-gray-200 rounded-lg bg-gray-50/50 shadow-sm overflow-hidden">
                  <img 
                    src={documentImage} 
                    alt="Documento escaneado" 
                    className="w-full h-28 object-contain cursor-pointer" 
                    onClick={() => setIsResultZoomed(true)}
                  />
                </div>
              </div>
            )}
            
            {/* Formulario de edición usando SimpleEditForm */}
            {transaction && (
              <div className="space-y-3">
                <h3 className="font-medium text-base text-gray-800 mb-2 flex items-center">
                  <Receipt className="h-4 w-4 mr-1.5 text-[#34C759]" />
                  Detalles del gasto
                </h3>
                
                <SimpleEditForm 
                  transaction={transaction}
                  extractedData={extractedData || {}}
                  categories={categories}
                  onCreateCategory={() => setNewCategoryDialogOpen(true)}
                  onSave={handleSaveChanges}
                  onSaveAndNavigate={handleGoToTransactions}
                  onUpdateCategory={handleUpdateCategory}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para la imagen ampliada */}
      {isResultZoomed && documentImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsResultZoomed(false)}
              className="absolute top-0 right-0 bg-white rounded-full h-8 w-8 -mt-4 -mr-4 z-10"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="bg-white p-2 rounded-md w-full overflow-auto">
              <img 
                src={documentImage} 
                alt="Vista ampliada del documento" 
                className="w-full h-auto max-h-[80vh] object-contain" 
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Diálogo para crear nueva categoría */}
      <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear nueva categoría</DialogTitle>
            <DialogDescription>
              Crea una categoría personalizada para tus gastos.
            </DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <option value="expense">Gasto</option>
                        <option value="income">Ingreso</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="color" 
                          {...field}
                          className="w-12 h-10 p-1" 
                        />
                        <Input 
                          type="text" 
                          value={field.value}
                          onChange={field.onChange}
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icono (emoji)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setNewCategoryDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Crear categoría</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentScanPage;