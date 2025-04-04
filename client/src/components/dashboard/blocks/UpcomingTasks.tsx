import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clipboard, Info, CheckCircle } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface UpcomingTasksProps {
  data: DashboardStats;
  isLoading: boolean;
}

// Función para obtener las fechas importantes fiscales
function obtenerFechasImportantes() {
  const fechaActual = new Date();
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth() + 1;
  
  const fechas = [
    { 
      id: 1, 
      titulo: "Declaración IVA - 1T", 
      descripcion: "Presentar modelo 303", 
      fecha: new Date(año, 3, 20), // 20 de abril
      tipo: "impuesto",
      urgente: mes >= 3 && mes <= 4 // urgente en marzo y abril
    },
    { 
      id: 2, 
      titulo: "Declaración IVA - 2T", 
      descripcion: "Presentar modelo 303", 
      fecha: new Date(año, 6, 20), // 20 de julio
      tipo: "impuesto",
      urgente: mes >= 6 && mes <= 7 // urgente en junio y julio
    },
    { 
      id: 3, 
      titulo: "Declaración IVA - 3T", 
      descripcion: "Presentar modelo 303", 
      fecha: new Date(año, 9, 20), // 20 de octubre
      tipo: "impuesto",
      urgente: mes >= 9 && mes <= 10 // urgente en septiembre y octubre
    },
    { 
      id: 4, 
      titulo: "Declaración IVA - 4T", 
      descripcion: "Presentar modelo 303", 
      fecha: new Date(año, 12, 20), // 20 de enero del siguiente año
      tipo: "impuesto",
      urgente: mes === 12 || mes === 1 // urgente en diciembre y enero
    },
    { 
      id: 5, 
      titulo: "Pago Autónomos", 
      descripcion: "Cuota mensual", 
      fecha: new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 30),
      tipo: "pago",
      urgente: new Date().getDate() >= 25 // urgente últimos días del mes
    }
  ];
  
  // Filtrar para mostrar solo las próximas tareas
  return fechas
    .filter(fecha => fecha.fecha >= fechaActual || fecha.urgente)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .slice(0, 3); // Tomar solo las 3 más próximas
}

const UpcomingTasks = ({ data, isLoading }: UpcomingTasksProps) => {
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-violet-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-violet-700 flex items-center">
              <Clipboard className="mr-2 h-5 w-5" />
              Próximas tareas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          
          <div className="mt-4">
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const tareasPendientes = obtenerFechasImportantes();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-violet-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-violet-700 flex items-center">
            <Clipboard className="mr-2 h-5 w-5" />
            Próximas tareas
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Recordatorios de plazos fiscales y pagos importantes.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {tareasPendientes.length > 0 ? (
            tareasPendientes.map((tarea) => (
              <div 
                key={tarea.id} 
                className="flex justify-between items-center p-2 border rounded-md hover:bg-violet-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className={`p-1 rounded-full mr-3 ${
                    tarea.tipo === 'impuesto' ? 'bg-blue-100' : 'bg-amber-100'
                  }`}>
                    <CheckCircle className={`h-4 w-4 ${
                      tarea.tipo === 'impuesto' ? 'text-blue-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium">{tarea.titulo}</div>
                    <div className="text-sm text-neutral-500">{tarea.descripcion}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge variant={tarea.urgente ? "destructive" : "outline"} className="ml-2">
                    {tarea.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-6 text-neutral-500">
              No hay tareas pendientes
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-violet-600 border-violet-300 hover:bg-violet-50"
            onClick={() => navigate("/tasks")}
          >
            Ver todas las tareas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingTasks;