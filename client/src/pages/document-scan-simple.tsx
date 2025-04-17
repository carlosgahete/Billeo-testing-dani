import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Receipt, ZoomIn, ZoomOut, X, ArrowLeft, Camera, FileIcon } from "lucide-react";
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
  // Mantener una copia del objeto de transacción original para comparar cambios
  const [originalTransaction, setOriginalTransaction] = useState<any>(null);
  const [isResultZoomed, setIsResultZoomed] = useState(false);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [showEditMode, setShowEditMode] = useState(false);
  const [isSecondStep, setIsSecondStep] = useState(false);
  
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
      
      // Asegurarse de que hay datos reales antes de establecer los estados
      const hasExtractedData = data.extractedData && Object.keys(data.extractedData).length > 0;
      const hasTransaction = data.transaction && Object.keys(data.transaction).length > 0;
      
      console.log('Datos extraídos del documento:', { 
        hasExtractedData, 
        hasTransaction, 
        extractedData: data.extractedData,
        transaction: data.transaction
      });
      
      // Establecer datos solo si realmente existen
      setExtractedData(hasExtractedData ? data.extractedData : null);
      
      // Guardar tanto la transacción actual como una copia del original para comparaciones
      if (hasTransaction) {
        const transactionData = data.transaction;
        setTransaction(transactionData);
        setOriginalTransaction({...transactionData}); // Crear una copia independiente
        console.log('Guardado estado original de la transacción para comparaciones futuras');
      } else {
        setTransaction(null);
        setOriginalTransaction(null);
      }
      
      setDocumentImage(data.documentUrl || null);
      
      // Ir directamente a edición sin mostrar el diálogo de confirmación
      setShowEditMode(true);
      setIsSecondStep(true);
      
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
    
    // IMPORTANTE: Inicializar explícitamente con null para evitar datos por defecto
    setExtractedData(null);
    setTransaction(null);
    setOriginalTransaction(null); // Importante: reiniciar también el estado original
    setDocumentImage(null);
    setShowEditMode(false);
    setIsSecondStep(false);
    
    console.log('Reiniciando formulario completamente - sin mostrar valores por defecto');
    
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
  
  // Función para actualizar la categoría de la transacción (en el estado local)
  const handleUpdateCategory = (categoryId: string | null) => {
    if (!transaction) return;
    
    // Convertir string a number o null
    const numericCategoryId = categoryId === "null" ? null : 
                              categoryId ? parseInt(categoryId) : null;
    
    // Solo actualizamos el estado local sin enviar petición al servidor todavía
    // Esto evita reescribir otros campos como amount que el usuario puede haber editado
    setTransaction({
      ...transaction,
      categoryId: numericCategoryId
    });
  };
  
  // Función para guardar los cambios realizados
  const handleSaveChanges = async () => {
    if (!transaction) return;
    
    try {
      // Verificar si solo ha cambiado la categoría o si hay otros cambios
      // Esto permite evitar sobrescribir otros campos que el usuario no ha modificado
      const onlyCategoryChanged = originalTransaction && 
        transaction.amount === originalTransaction.amount &&
        transaction.description === originalTransaction.description &&
        transaction.date === originalTransaction.date &&
        transaction.categoryId !== originalTransaction.categoryId;
      
      // Si solo ha cambiado la categoría, enviamos solo ese campo para actualizar
      const dataToSend = onlyCategoryChanged ? 
        { categoryId: transaction.categoryId } : transaction;
      
      console.log('Guardando cambios:', onlyCategoryChanged ? 'Solo categoría' : 'Transacción completa');
      
      // Realizar la petición al servidor con los datos apropiados
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Invalidar consultas
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      
      toast({
        title: "Cambios guardados",
        description: "Los cambios en el gasto se han guardado correctamente",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Error al guardar los cambios",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Manejador para el envío del formulario de categoría
  const onSubmitCategory = (data: CategoryFormValues) => {
    handleCreateCategory(data);
  };
  
  return (
    <div className={`min-h-screen w-full ${!isSecondStep ? 'flex items-center justify-center' : 'py-4'}`}>
      {/* Botón flotante estilo Apple premium para volver en móvil */}
      <div className="sm:hidden fixed top-3 left-3 z-10">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/transactions")} 
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 14px rgba(0,0,0,0.08)",
            border: "1px solid rgba(209, 213, 219, 0.5)"
          }}
        >
          <ArrowLeft className="h-5 w-5 text-[#007AFF]" />
        </Button>
      </div>
      
      {/* Contenedor principal - posicionamiento diferente según el paso */}
      <div 
        className={`w-full ${!isSecondStep ? 'max-w-[340px] px-3 text-center rounded-[20px] py-6' : 'max-w-[500px] mx-auto px-4'}`}
        style={!isSecondStep ? {
          position: "absolute",
          top: "55%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: "rgba(247, 247, 247, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.5)",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)"
        } : {}}
      >
        {/* Título con estilo Apple auténtico */}
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-gray-900 mb-1" style={{ 
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            letterSpacing: "-0.025em",
            background: "linear-gradient(to right, #1E293B, #334155)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Escanear Factura</h1>
          <p className="text-[14px] text-gray-500 font-normal" style={{ 
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            letterSpacing: "-0.01em"
          }}>Sube una imagen o PDF de tu factura</p>
        </div>
        
        {/* Control de archivos invisible */}
        <input
          type="file"
          id="file-input"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {!showEditMode ? (
          // Modo de subida de documento
          <div className="w-full">
            {/* Zona de arrastrar y soltar moderno y limpio */}
            <div 
              className="w-full rounded-[16px] py-7 px-4 text-center cursor-pointer"
              style={{
                background: "linear-gradient(to bottom, rgba(250, 250, 252, 0.9), rgba(245, 245, 247, 0.9))",
                boxShadow: "0 1px 6px rgba(0, 0, 0, 0.03), inset 0 0 0 0.5px rgba(255, 255, 255, 0.8)",
                border: "1px solid rgba(209, 213, 219, 0.3)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)"
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {/* Icono con diseño Apple auténtico - centrado */}
              <div className="flex items-center justify-center w-full mb-4">
                <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
                <g fill="none" fillRule="evenodd">
                  <circle fill="#007AFF" cx="28" cy="28" r="28"/>
                  <g stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M28 19v18M22 25l6-6 6 6"/>
                    <path d="M19 29v4a5 5 0 005 5h8a5 5 0 005-5v-4"/>
                  </g>
                </g>
              </svg>
              </div>
              
              <p 
                className="text-[18px] font-medium text-gray-800 mt-5" 
                style={{ 
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(to bottom, #1A1A1A, #4A4A4A)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                Arrastra y suelta o selecciona un archivo
              </p>
              
              <div className="inline-flex items-center justify-center bg-[#F2F2F7]/80 rounded-full px-4 py-1.5 mt-5" style={{
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  boxShadow: "inset 0 0 0 0.5px rgba(0, 0, 0, 0.08)"
                }}>
                <p className="text-gray-500 text-sm font-medium"
                  style={{ 
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                    letterSpacing: "-0.01em"
                  }}
                >
                  JPG, PNG, PDF
                </p>
              </div>
              
              {fileName && (
                <div className="mt-3">
                  <Badge 
                    variant="secondary" 
                    className="text-[#0A84FF] bg-blue-50 py-1 px-3 rounded-full"
                    style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}
                  >
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
            
            {/* Botón de procesamiento estilo Apple SF Symbols */}
            <div className="mt-6 mb-2">
              {file && (
                <div className="flex justify-center mb-3">
                  <div
                    className="inline-flex items-center bg-[#F2F2F7]/80 rounded-full px-4 py-1.5"
                    style={{
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      boxShadow: "inset 0 0 0 0.5px rgba(0, 0, 0, 0.08)"
                    }}
                  >
                    <p className="text-gray-600 text-sm font-medium"
                      style={{ 
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                        letterSpacing: "-0.01em"
                      }}
                    >
                      {file.name.split('.').pop()?.toUpperCase()} - {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleUpload} 
                disabled={!file || uploading}
                className="relative px-5 py-2.5 text-[15px] font-medium w-auto mx-auto transition-all duration-200 flex items-center justify-center rounded-md"
                style={{
                  background: !file || uploading ? 
                    "#F2F2F7" : 
                    "#007AFF",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                  letterSpacing: "-0.01em",
                  fontWeight: 500,
                  opacity: !file ? "0.6" : "1",
                  color: !file || uploading ? "#8E8E93" : "white",
                  border: "none",
                  cursor: !file || uploading ? "default" : "pointer"
                }}
              >
                {uploading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin mr-1.5 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>Procesar documento</span>
                  </div>
                )}
              </button>
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
                  transaction={transaction || {}}
                  extractedData={extractedData || null}
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