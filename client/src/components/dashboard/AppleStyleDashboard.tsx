import React, { useState, useEffect } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';
import { WidgetSize, WidgetType, WidgetLayout, DashboardPreferences } from '@/types/dashboard';
import * as Widgets from './AppleStyleWidgets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Edit, Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AppleStyleDashboardProps {
  className?: string;
}

const AppleStyleDashboard: React.FC<AppleStyleDashboardProps> = ({ className }) => {
  const { isLoading, data, refetch } = useDashboardData();
  const [isEditing, setIsEditing] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<WidgetLayout | null>(null);
  const [preferences, setPreferences] = useState<DashboardPreferences | null>(null);
  const { toast } = useToast();

  // Cargar preferencias al inicio
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/dashboard/preferences');
        if (response.ok) {
          const prefs = await response.json();
          setPreferences(prefs);
          setCurrentLayout(prefs.layout || getDefaultLayout());
        } else {
          setCurrentLayout(getDefaultLayout());
        }
      } catch (error) {
        console.error('Error fetching dashboard preferences:', error);
        setCurrentLayout(getDefaultLayout());
      }
    };

    fetchPreferences();
  }, []);

  // Obtener diseño por defecto
  const getDefaultLayout = (): WidgetLayout => {
    return {
      blocks: [
        { id: 'invoices', type: 'InvoicesWidget' as const, size: 'medium', position: { row: 1, col: 1 } },
        { id: 'expenses', type: 'ExpensesWidget' as const, size: 'medium', position: { row: 1, col: 2 } },
        { id: 'result', type: 'ResultWidget' as const, size: 'medium', position: { row: 2, col: 1 } },
        { id: 'taxSummary', type: 'TaxSummaryWidget' as const, size: 'large', position: { row: 2, col: 2 } },
        { id: 'financialComparison', type: 'FinancialComparisonWidget' as const, size: 'large', position: { row: 3, col: 1 } },
        { id: 'quotes', type: 'QuotesWidget' as const, size: 'small', position: { row: 4, col: 1 } },
        { id: 'clients', type: 'ClientsWidget' as const, size: 'small', position: { row: 4, col: 2 } },
        { id: 'tasks', type: 'TasksWidget' as const, size: 'medium', position: { row: 5, col: 1 } }
      ]
    };
  };

  // Guardar las preferencias del dashboard
  const savePreferences = async () => {
    if (!currentLayout) return;

    try {
      const response = await fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          layout: currentLayout
        })
      });

      if (response.ok) {
        const updatedPrefs = await response.json();
        setPreferences(updatedPrefs);
        setIsEditing(false);
        toast({
          title: "Dashboard actualizado",
          description: "Tus preferencias han sido guardadas correctamente.",
        });
      } else {
        throw new Error('Error saving preferences');
      }
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar tus preferencias. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  // Renderiza un widget específico según su tipo
  const renderWidget = (type: WidgetType, size: WidgetSize) => {
    // Mapeo explícito de tipos de widget a componentes
    const widgetComponents: Record<WidgetType, React.ComponentType<{ data?: any; size: WidgetSize }>> = {
      'InvoicesWidget': Widgets.InvoicesWidget,
      'ExpensesWidget': Widgets.ExpensesWidget,
      'ResultWidget': Widgets.ResultWidget,
      'TaxSummaryWidget': Widgets.TaxSummaryWidget,
      'FinancialComparisonWidget': Widgets.FinancialComparisonWidget,
      'QuotesWidget': Widgets.QuotesWidget,
      'ClientsWidget': Widgets.ClientsWidget,
      'TasksWidget': Widgets.TasksWidget
    };
    
    const WidgetComponent = widgetComponents[type];
    
    if (!WidgetComponent) {
      console.error(`Widget type not found: ${type}`);
      return <div className="p-4 border rounded-lg">Widget no encontrado: {type}</div>;
    }
    
    return <WidgetComponent data={data} size={size} />;
  };

  // Obtiene el tamaño de la clase para un widget según su tamaño
  const getWidgetSizeClass = (size: WidgetSize) => {
    switch (size) {
      case 'small':
        return 'col-span-1 row-span-1 h-40';
      case 'medium':
        return 'col-span-1 row-span-2 h-80';
      case 'large':
        return 'col-span-2 row-span-2 h-80';
      default:
        return 'col-span-1 row-span-1 h-40';
    }
  };

  if (isLoading || !currentLayout) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando tu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("py-6", className)}>
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={savePreferences}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar cambios
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Personalizar
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="mb-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="finances">Finanzas</TabsTrigger>
            <TabsTrigger value="invoices">Facturación</TabsTrigger>
            <TabsTrigger value="taxes">Impuestos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              {currentLayout.blocks.map((block) => (
                <div
                  key={block.id}
                  className={cn(
                    "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 overflow-hidden",
                    getWidgetSizeClass(block.size),
                    isEditing && "border-dashed border-2 border-blue-300 cursor-move"
                  )}
                  style={{
                    gridRow: `span ${block.size === 'large' || block.size === 'medium' ? 2 : 1}`,
                    gridColumn: `span ${block.size === 'large' ? 2 : 1}`
                  }}
                >
                  {renderWidget(block.type, block.size)}
                </div>
              ))}

              {isEditing && (
                <div className="col-span-1 row-span-1 h-40 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                  <button className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-primary">
                    <Plus className="h-8 w-8" />
                    <span className="text-sm mt-2">Añadir widget</span>
                  </button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Otros tabs aquí */}
          <TabsContent value="finances">
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">Vista de finanzas en desarrollo</p>
            </div>
          </TabsContent>
          
          <TabsContent value="invoices">
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">Vista de facturación en desarrollo</p>
            </div>
          </TabsContent>
          
          <TabsContent value="taxes">
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">Vista de impuestos en desarrollo</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AppleStyleDashboard;