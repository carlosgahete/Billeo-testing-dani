import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import CompanyForm from "@/components/company/CompanyForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CompanyPage = () => {
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="ml-16 md:ml-0">
        <h1 className="text-2xl font-bold text-neutral-800">Perfil de empresa</h1>
        <p className="text-neutral-500">
          Gestiona los datos fiscales y de contacto de tu empresa
        </p>
      </div>
      
      <Card className="bg-white shadow-sm border border-neutral-200 mb-6">
        <CardHeader>
          <CardTitle>Datos fiscales</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600 mb-4">
            Esta información se utilizará para generar las facturas y otros documentos oficiales.
            Es importante que los datos sean correctos y estén actualizados.
          </p>
          
          <CompanyForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyPage;
