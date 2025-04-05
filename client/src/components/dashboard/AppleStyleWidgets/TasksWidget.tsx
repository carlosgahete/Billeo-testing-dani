import React from 'react';
import { DashboardStats, WidgetSize } from '@/types/dashboard';
import { CheckCircle2, Circle } from 'lucide-react';

interface TasksWidgetProps {
  data?: DashboardStats;
  size: WidgetSize;
}

const TasksWidget: React.FC<TasksWidgetProps> = ({ data, size }) => {
  if (!data) {
    return <div className="flex items-center justify-center h-full">Cargando datos...</div>;
  }
  
  // Usar datos reales si están disponibles, o datos de muestra si no
  const tasks = data.tasks || {
    total: 8,
    completed: 3,
    pending: 5
  };
  
  // Generar datos de muestra para las tareas
  const sampleTasks = [
    { title: "Enviar factura a Cliente A", completed: false, deadline: "Hoy" },
    { title: "Preparar declaración IVA", completed: false, deadline: "5 días" },
    { title: "Reunión con nuevo cliente", completed: false, deadline: "2 días" },
    { title: "Actualizar presupuesto", completed: true, deadline: "Completada" },
    { title: "Revisar gastos mensuales", completed: true, deadline: "Completada" }
  ];
  
  // Ordenar tareas con pendientes primero
  const sortedTasks = [...sampleTasks].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });
  
  // Tareas a mostrar según el tamaño del widget
  let tasksToShow = 2; // Default para small
  if (size === 'medium') {
    tasksToShow = 4;
  } else if (size === 'large') {
    tasksToShow = sortedTasks.length;
  }
  
  // Renderizado según tamaño
  if (size === 'small') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-primary mr-2">
            {tasks.pending}
          </span>
          <span className="text-xs text-muted-foreground">pendientes</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {tasks.completed} completadas
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="text-lg font-bold">{tasks.total} Tareas</span>
        </div>
        
        <div className="flex space-x-3 text-sm">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-primary mr-1"></div>
            <span>{tasks.pending} pendientes</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
            <span>{tasks.completed} completadas</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="space-y-2">
          {sortedTasks.slice(0, tasksToShow).map((task, index) => (
            <div 
              key={index} 
              className={`p-2 rounded-lg flex items-start space-x-2 ${
                task.completed 
                  ? 'bg-gray-50 dark:bg-gray-800/30 text-muted-foreground'
                  : 'bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.completed ? 'line-through' : 'font-medium'}`}>
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {task.deadline}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {(size === 'medium' || size === 'large') && (
        <div className="mt-3 text-center">
          <button className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            {size === 'large' ? 'Gestionar todas las tareas' : 'Ver todas'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TasksWidget;