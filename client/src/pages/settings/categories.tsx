import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/ui/page-header";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

// Schema for category
const categorySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["income", "expense"], {
    required_error: "Selecciona el tipo de categoría",
  }),
  color: z.string().optional(),
});

// Type for our form values
type CategoryFormValues = z.infer<typeof categorySchema>;

// Interface for category data
interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color?: string;
  userId: number;
}

const CategorySettingsPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Form definition
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      color: "#6E56CF", // Default color (primary color)
    },
  });

  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest<Category[]>("/api/categories"),
  });

  // Mutations for CRUD operations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      return apiRequest("/api/categories", { 
        method: "POST", 
        data
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Categoría creada", 
        description: "La categoría se ha creado correctamente" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "No se pudo crear la categoría", 
        variant: "destructive" 
      });
      console.error("Error creating category:", error);
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { id: number; data: CategoryFormValues }) => {
      return apiRequest(`/api/categories/${data.id}`, { 
        method: "PUT", 
        data: data.data 
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Categoría actualizada", 
        description: "La categoría se ha actualizado correctamente" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsEditing(false);
      setSelectedCategory(null);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "No se pudo actualizar la categoría", 
        variant: "destructive" 
      });
      console.error("Error updating category:", error);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/categories/${id}`, { 
        method: "DELETE" 
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Categoría eliminada", 
        description: "La categoría se ha eliminado correctamente" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "No se pudo eliminar la categoría. Podría estar siendo utilizada en transacciones.", 
        variant: "destructive" 
      });
      console.error("Error deleting category:", error);
    }
  });

  // Handle form submission
  const onSubmit = (values: CategoryFormValues) => {
    if (isEditing && selectedCategory) {
      updateCategoryMutation.mutate({ 
        id: selectedCategory.id, 
        data: values 
      });
    } else {
      createCategoryMutation.mutate(values);
    }
  };

  // Handle edit button click
  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsEditing(true);
    form.reset({
      name: category.name,
      type: category.type,
      color: category.color || "#6E56CF",
    });
  };

  // Handle delete button click
  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  // Handle cancel button click
  const handleCancel = () => {
    setIsEditing(false);
    setSelectedCategory(null);
    form.reset({
      name: "",
      type: "expense",
      color: "#6E56CF",
    });
  };

  // Confirm deletion
  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete.id);
    }
  };

  // Count categories by type
  const incomeCategoriesCount = categories?.filter(cat => cat.type === "income").length || 0;
  const expenseCategoriesCount = categories?.filter(cat => cat.type === "expense").length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gestión de Categorías"
        description="Crea y gestiona categorías para clasificar tus ingresos y gastos"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{isEditing ? "Editar Categoría" : "Nueva Categoría"}</CardTitle>
            <CardDescription>
              {isEditing 
                ? "Actualiza los detalles de la categoría"
                : "Crea una nueva categoría para organizar tus finanzas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la categoría" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">Ingreso</SelectItem>
                          <SelectItem value="expense">Gasto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color (opcional)</FormLabel>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="color" 
                          {...field} 
                          className="w-12 h-8 p-1 cursor-pointer"
                        />
                        <Input 
                          type="text" 
                          {...field} 
                          className="flex-1"
                          placeholder="#6E56CF"
                        />
                      </div>
                      <FormDescription>
                        Elige un color para identificar la categoría
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  >
                    {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEditing ? "Actualizando..." : "Guardando..."}
                      </>
                    ) : (
                      isEditing ? "Actualizar Categoría" : "Crear Categoría"
                    )}
                  </Button>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="w-1/3"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between bg-muted/50 border-t">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{categories?.length || 0}</span> categorías en total
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">{incomeCategoriesCount}</span> ingresos
              </div>
              <div>
                <span className="font-medium">{expenseCategoriesCount}</span> gastos
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Categories List Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Categorías existentes</CardTitle>
            <CardDescription>
              Todas las categorías para clasificar tus ingresos y gastos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="income">Ingresos</TabsTrigger>
                <TabsTrigger value="expense">Gastos</TabsTrigger>
              </TabsList>
              
              {isCategoriesLoading ? (
                <div className="w-full h-40 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <TabsContent value="all" className="mt-0">
                    <CategoriesTable 
                      categories={categories || []} 
                      onEdit={handleEdit} 
                      onDelete={handleDelete}
                    />
                  </TabsContent>
                  
                  <TabsContent value="income" className="mt-0">
                    <CategoriesTable 
                      categories={(categories || []).filter(cat => cat.type === "income")} 
                      onEdit={handleEdit} 
                      onDelete={handleDelete}
                    />
                  </TabsContent>
                  
                  <TabsContent value="expense" className="mt-0">
                    <CategoriesTable 
                      categories={(categories || []).filter(cat => cat.type === "expense")} 
                      onEdit={handleEdit} 
                      onDelete={handleDelete}
                    />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro que deseas eliminar esta categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si esta categoría está siendo utilizada en transacciones, 
              esas transacciones quedarán sin categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Categories table component
interface CategoriesTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

const CategoriesTable: React.FC<CategoriesTableProps> = ({ categories, onEdit, onDelete }) => {
  if (categories.length === 0) {
    return (
      <div className="text-center py-10 border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No hay categorías disponibles</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Color</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color || "#6E56CF" }}
                />
              </TableCell>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell>
                {category.type === "income" ? "Ingreso" : "Gasto"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(category)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CategorySettingsPage;