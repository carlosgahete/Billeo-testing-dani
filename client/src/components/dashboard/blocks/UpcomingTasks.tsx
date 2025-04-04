import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Info, CheckCircle2 } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpcomingTasksProps {
  data: DashboardStats;
  isLoading: boolean;
}

const UpcomingTasks: React.FC<UpcomingTasksProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-purple-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-purple-700 flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Tareas Pendientes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Datos de ejemplo para las tareas pendientes
  const upcomingTasks = [
    { 
      id: 1, 
      title: "Pago trimestral de IVA", 
      dueDate: new Date("2025-04-20"), 
      priority: "high", 
      type: "tax",
      completed: false,
    },
    { 
      id: 2, 
      title: "Emitir factura a Cliente XYZ", 
      dueDate: new Date("2025-04-10"), 
      priority: "medium", 
      type: "invoice",
      completed: false,
    },
    { 
      id: 3, 
      title: "Revisar gastos mensuales", 
      dueDate: new Date("2025-04-05"), 
      priority: "low", 
      type: "task",
      completed: false,
    },
    { 
      id: 4, 
      title: "Actualizar registro de kilometraje", 
      dueDate: new Date("2025-04-02"), 
      priority: "low", 
      type: "task",
      completed: true,
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "tax":
        return <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">Impuesto</Badge>;
      case "invoice":
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Factura</Badge>;
      case "task":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Tarea</Badge>;
      default:
        return <Badge variant="outline">Otro</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
    }).format(date);
  };

  const getDaysRemaining = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return "Atrasado";
    } else if (diffDays === 0) {
      return "Hoy";
    } else if (diffDays === 1) {
      return "Mañana";
    } else {
      return `${diffDays} días`;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-purple-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-purple-700 flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Tareas Pendientes
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Próximas tareas, fechas límite para impuestos y facturas por emitir.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {upcomingTasks.map((task) => (
            <div 
              key={task.id} 
              className={cn(
                "p-3 border rounded-md flex items-center justify-between",
                task.completed ? "opacity-60" : ""
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium",
                  !task.completed ? getPriorityColor(task.priority) : "bg-gray-100 text-gray-500"
                )}>
                  {formatDate(task.dueDate)}
                </div>
                <div>
                  <div className="flex items-center">
                    <span className={cn(
                      "font-medium",
                      task.completed ? "line-through text-gray-500" : ""
                    )}>
                      {task.title}
                    </span>
                    {task.completed && (
                      <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center mt-1 space-x-2">
                    {getTypeIcon(task.type)}
                    <span className="text-xs text-gray-500">
                      {!task.completed ? getDaysRemaining(task.dueDate) : "Completada"}
                    </span>
                  </div>
                </div>
              </div>
              {!task.completed && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-purple-600 border-purple-300 hover:bg-purple-50"
          >
            Ver todas las tareas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingTasks;