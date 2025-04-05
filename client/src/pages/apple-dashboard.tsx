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

  return (
    <div className="container mx-auto p-0 md:p-6">
      <div className="mb-6">
        <PageTitle
          title="Tu Dashboard"
          description="Visualiza y gestiona tu información financiera"
        />
      </div>
      
      <AppleStyleDashboard />
    </div>
  );
};

export default AppleDashboardPage;