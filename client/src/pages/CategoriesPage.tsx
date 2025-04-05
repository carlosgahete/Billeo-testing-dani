import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageTitle } from "@/components/ui/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Lista de emojis comunes para categorías
const CATEGORY_EMOJIS = [
  "💰", "💼", "🏢", "🖥️", "📱", "🚗", "✈️", "🏨", "🍽️", "📦",
  "📊", "📈", "🔧", "🛠️", "🧰", "📝", "📑", "📁", "💡", "🔒",
  "📣", "📞", "📧", "🌐", "💻", "🖨️", "📚", "🎓", "🏆", "🎯"
];

// Paleta de colores para categorías
const COLOR_PALETTE = [
  "#4f46e5", "#06b6d4", "#10b981", "#84cc16", "#f59e0b", 
  "#ef4444", "#8b5cf6", "#ec4899", "#f97316", "#0ea5e9"
];

const CategoriesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "expense",
    color: COLOR_PALETTE[0],
    icon: CATEGORY_EMOJIS[0],
  });

  // Consultar categorías
  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Mutación para crear categoría
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/categories", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoría creada",
        description: "La categoría se ha creado correctamente",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "No se pudo crear la categoría",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar categoría
  const updateMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/categories/${data.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoría actualizada",
        description: "La categoría se ha actualizado correctamente",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría",
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar categoría
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/categories/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoría eliminada",
        description: "La categoría se ha eliminado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive",
      });
    },
  });

  // Manejar envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        ...newCategory,
      });
    } else {
      createMutation.mutate(newCategory);
    }
  };

  // Resetear el formulario
  const resetForm = () => {
    setNewCategory({
      name: "",
      type: "expense",
      color: COLOR_PALETTE[0],
      icon: CATEGORY_EMOJIS[0],
    });
    setEditingCategory(null);
  };

  // Configurar edición de categoría
  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      type: category.type,
      color: category.color || COLOR_PALETTE[0],
      icon: category.icon || CATEGORY_EMOJIS[0],
    });
    setIsDialogOpen(true);
  };

  // Configurar eliminación de categoría
  const handleDelete = (id: number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta categoría?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageTitle 
          title="Categorías" 
          description="Administra y personaliza tus categorías"
          variant="gradient"
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar categoría" : "Crear nueva categoría"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={newCategory.type}
                  onValueChange={(value) => setNewCategory({ ...newCategory, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-5 gap-2 mt-1">
                  {COLOR_PALETTE.map((color) => (
                    <div
                      key={color}
                      className={`h-8 w-8 rounded-full cursor-pointer ${
                        newCategory.color === color ? "ring-2 ring-offset-2 ring-primary" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCategory({ ...newCategory, color })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Emoji/Icono</Label>
                <div className="grid grid-cols-5 gap-2 mt-1 max-h-24 overflow-y-auto">
                  {CATEGORY_EMOJIS.map((emoji) => (
                    <div
                      key={emoji}
                      className={`h-8 w-8 flex items-center justify-center text-lg cursor-pointer rounded ${
                        newCategory.icon === emoji ? "bg-muted ring-2 ring-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => setNewCategory({ ...newCategory, icon: emoji })}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCategory ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories && Array.isArray(categories) && categories.length > 0 ? (
            (categories as any[]).map((category: any) => (
              <Card key={category.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-md font-medium flex items-center">
                    <span 
                      className="text-xl mr-2"
                      style={{ color: category.color || "currentColor" }}
                    >
                      {category.icon || "📁"}
                    </span>
                    {category.name}
                  </CardTitle>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Tipo: {category.type === "expense" ? "Gasto" : "Ingreso"}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No hay categorías definidas. Crea una nueva categoría para empezar.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;