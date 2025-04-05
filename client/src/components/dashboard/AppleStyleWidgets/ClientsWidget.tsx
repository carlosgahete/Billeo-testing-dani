import React from 'react';
import { DashboardStats, WidgetSize } from '@/types/dashboard';

interface ClientsWidgetProps {
  data?: DashboardStats;
  size: WidgetSize;
}

const ClientsWidget: React.FC<ClientsWidgetProps> = ({ data, size }) => {
  if (!data) {
    return <div className="flex items-center justify-center h-full">Cargando datos...</div>;
  }
  
  // Usar datos reales si están disponibles, o datos de muestra si no
  const clients = data.clients || {
    total: 12,
    active: 8,
    new: 3
  };
  
  // Generar datos de muestra para los clientes principales
  const topClients = [
    { name: "Cliente Principal", projects: 8, revenue: 120000 },
    { name: "Cliente Secundario", projects: 5, revenue: 85000 },
    { name: "Cliente Terciario", projects: 3, revenue: 45000 },
  ];
  
  // Renderizado según tamaño
  if (size === 'small') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-2xl font-bold text-primary">
          {clients.total}
        </span>
        <span className="text-xs text-muted-foreground">Clientes totales</span>
      </div>
    );
  }

  if (size === 'medium') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col">
          <span className="text-2xl font-bold">{clients.total}</span>
          <span className="text-sm text-muted-foreground">Clientes totales</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Clientes activos</p>
            <p className="text-xl font-semibold text-green-600 dark:text-green-400">
              {clients.active}
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Nuevos este mes</p>
            <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
              {clients.new}
            </p>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <button className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            Gestionar clientes
          </button>
        </div>
      </div>
    );
  }

  // Para tamaño grande
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-2xl font-bold">{clients.total}</span>
          <span className="text-sm text-muted-foreground ml-2">Clientes totales</span>
        </div>
        
        <div className="flex space-x-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {clients.active}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Nuevos</p>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {clients.new}
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
        <h5 className="text-sm font-medium mb-2">Clientes principales</h5>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {topClients.map((client, index) => (
            <div key={index} className="py-2 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{client.name}</p>
                <p className="text-xs text-muted-foreground">{client.projects} proyectos</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{(client.revenue / 1000).toFixed(0)}K €</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-auto flex space-x-2">
        <button className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          Nuevo cliente
        </button>
        <button className="flex-1 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
          Ver todos
        </button>
      </div>
    </div>
  );
};

export default ClientsWidget;