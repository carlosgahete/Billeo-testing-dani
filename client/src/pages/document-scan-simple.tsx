import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Upload, FileText, Receipt, ZoomIn, ZoomOut, X, Plus, Check, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Receipt className="h-7 w-7 mr-3 text-[#007AFF]" />
            Escanear documento
          </h1>
          <p className="text-muted-foreground">
            Sube una factura o documento para procesarlo automáticamente.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/transactions")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a transacciones
        </Button>
      </div>
      
      <div className="grid gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-8">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Procesar documento
            </CardTitle>
            <CardDescription>
              Sube una factura para extraer automáticamente los datos fiscales.
            </CardDescription>
          </CardHeader>
          <CardContent className="-mt-4">
            {!showEditMode ? (
              <div className="space-y-6">
                {/* Zona de arrastrar y soltar */}
                <div 
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    type="file"
                    id="file-input"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="space-y-3">
                    <div className="mx-auto h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center">
                      <Upload className="h-10 w-10 text-[#007AFF]" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Arrastra y suelta o haz clic para subir
                    </h3>
                    <p className="text-sm text-gray-500">
                      Formatos aceptados: JPG, PNG, PDF
                    </p>
                    {fileName && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-[#007AFF] bg-blue-50">
                          {fileName}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Vista previa si es una imagen */}
                {previewUrl && (
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
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
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleUpload} 
                    disabled={!file || uploading}
                    className="flex items-center px-4 bg-[#007AFF] hover:bg-blue-600 text-white"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Procesar documento
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // Formulario de edición mostrado directamente sin diálogo de confirmación
              <div className="space-y-3">
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
          </CardContent>
        </Card>
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