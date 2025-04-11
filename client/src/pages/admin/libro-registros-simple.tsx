import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SimpleLibroRegistros() {
  const params = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const userId = params?.userId || '';

  useEffect(() => {
    // Simulación de carga
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Libro de Registros</h1>
          <p className="text-sm text-gray-500">
            Visualizando registros del usuario ID: {userId || 'No seleccionado'}
          </p>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Versión Simplificada</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Esta es una versión simplificada del Libro de Registros para pruebas.</p>
          <p className="mt-2">En la versión final, aquí verás:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Tabla de facturas</li>
            <li>Tabla de transacciones</li>
            <li>Tabla de presupuestos</li>
            <li>Opciones de filtrado y búsqueda</li>
            <li>Exportación a PDF y XLS</li>
          </ul>
          
          <div className="bg-blue-50 p-4 rounded-md mt-4">
            <p className="text-blue-700 font-medium">Información</p>
            <p className="text-sm mt-1">
              Esta página se está mostrando con ID de usuario: {userId || 'Ninguno'}
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{Math.floor(Math.random() * 50)}</p>
            <p className="text-sm text-gray-500 mt-1">Total de facturas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{Math.floor(Math.random() * 100)}</p>
            <p className="text-sm text-gray-500 mt-1">Total de transacciones</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Presupuestos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{Math.floor(Math.random() * 20)}</p>
            <p className="text-sm text-gray-500 mt-1">Total de presupuestos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}