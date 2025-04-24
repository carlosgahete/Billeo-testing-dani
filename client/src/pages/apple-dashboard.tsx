import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageTitle } from '@/components/ui/page-title';
import AppleStyleDashboard from '@/components/dashboard/AppleStyleDashboard';
import { Loader2 } from 'lucide-react';

const AppleDashboardPage: React.FC = () => {
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ['/api/auth/session'],
  });

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Verificar autenticación
  if (!user?.authenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-bold mb-4">No has iniciado sesión</h2>
          <p className="mb-4 text-muted-foreground">
            Debes iniciar sesión para acceder a tu dashboard.
          </p>
          <a
            href="/login"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  // Renderizado seguro con manejo de errores
  return (
    <div className="container mx-auto p-0 md:p-6">
      <div className="mb-6">
        <PageTitle
          title="Tu Dashboard"
          description="Visualiza y gestiona tu información financiera"
        />
      </div>
      
      <ErrorBoundary>
        <AppleStyleDashboard />
      </ErrorBoundary>
    </div>
  );
};

// Componente para manejar errores en el dashboard
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Actualizar el estado para mostrar la UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Registrar el error en la consola
    console.error("Error en el componente de dashboard:", error);
  }

  render() {
    if (this.state.hasError) {
      // Renderizar UI de fallback
      return (
        <div className="p-6 bg-red-50 rounded-lg border border-red-100 text-center">
          <h3 className="text-xl font-semibold text-red-600 mb-2">
            Error al cargar el dashboard
          </h3>
          <p className="text-gray-600 mb-4">
            Ha ocurrido un error al cargar la visualización del dashboard. 
            Por favor, intenta recargar la página o contacta con soporte.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppleDashboardPage;