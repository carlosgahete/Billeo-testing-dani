import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

const TasksList = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "medium",
  });
  
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES");
  };

  const getDaysRemaining = (dateString: string | null) => {
    if (!dateString) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Vencida hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return "Vence hoy";
    } else {
      return `Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    }
  };

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return apiRequest("PUT", `/api/tasks/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar la tarea: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        dueDate: new Date().toISOString().split("T")[0],
        priority: "medium",
      });
      toast({
        title: "Tarea creada",
        description: "La tarea se ha creado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `No se pudo crear la tarea: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleTaskToggle = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, completed: !completed });
  };

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "El título de la tarea es obligatorio",
        variant: "destructive",
      });
      return;
    }
    
    createTaskMutation.mutate(newTask);
  };

  return (
    <Card>
      <CardHeader className="border-b border-neutral-200 p-4 flex-row justify-between items-center space-y-0">
        <CardTitle className="font-medium text-neutral-800">Tareas pendientes</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-600 hover:text-primary-700">
              <Plus size={20} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva tarea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Título de la tarea"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Descripción de la tarea"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Fecha de vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <select
                  id="priority"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={handleCreateTask} 
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? "Creando..." : "Crear tarea"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-4 divide-y divide-neutral-200">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="py-2 flex items-center">
              <Skeleton className="h-4 w-4 rounded mr-3" />
              <div>
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : tasks?.length > 0 ? (
          tasks.map((task: Task) => (
            <div key={task.id} className="py-2 flex items-center">
              <Checkbox
                id={`task-${task.id}`}
                checked={task.completed}
                onCheckedChange={() => handleTaskToggle(task.id, task.completed)}
                className="mr-3"
              />
              <div>
                <label
                  htmlFor={`task-${task.id}`}
                  className={`text-sm font-medium ${
                    task.completed ? "line-through text-neutral-500" : ""
                  } cursor-pointer`}
                >
                  {task.title}
                </label>
                <p className="text-xs text-neutral-500">
                  {task.completed 
                    ? "Completada" 
                    : task.dueDate 
                      ? getDaysRemaining(task.dueDate)
                      : "Sin fecha de vencimiento"}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-neutral-500">
            No hay tareas pendientes
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TasksList;
