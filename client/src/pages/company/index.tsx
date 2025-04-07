import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2 } from "lucide-react";
import CompanyForm from "@/components/company/CompanyForm";

const CompanyPage = () => {
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
      {/* Encabezado estilo Apple */}
      <div className="mb-8">
        <div className="flex items-center mb-4 space-x-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-2xl shadow-sm">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-medium text-gray-900">Perfil de empresa</h1>
        </div>
        <p className="text-gray-500 ml-12 max-w-3xl">
          Gestiona los datos fiscales y de contacto de tu empresa. Esta información se utilizará para generar facturas y documentos oficiales.
        </p>
      </div>
      
      {/* Contenedor principal con efecto de vidrio */}
      <div className="backdrop-blur-lg bg-white/80 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-6 bg-gradient-to-r from-gray-50/90 to-white/90">
          <h2 className="text-xl font-medium text-gray-900 mb-1">Datos fiscales</h2>
          <p className="text-sm text-gray-500">
            Mantén actualizada la información fiscal de tu empresa
          </p>
        </div>
        
        <div className="px-6 py-6">
          <CompanyForm />
        </div>
      </div>
    </div>
  );
};

export default CompanyPage;
