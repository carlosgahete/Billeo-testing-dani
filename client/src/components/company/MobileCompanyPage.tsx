import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ChevronLeft, Camera, Building2, Mail, Phone, MapPin, CreditCard } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileUpload from "@/components/common/FileUpload";
import { Loader2 } from "lucide-react";

// Schema para validación
const companyFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  taxId: z.string().min(1, "El NIF/CIF es obligatorio"),
  address: z.string().min(1, "La dirección es obligatoria"),
  city: z.string().min(1, "La ciudad es obligatoria"),
  postalCode: z.string().min(1, "El código postal es obligatorio"),
  country: z.string().min(1, "El país es obligatorio"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  bankAccount: z.string().optional().or(z.literal("")),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface CompanyData {
  id?: number;
  name?: string;
  taxId?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  email?: string | null;
  phone?: string | null;
  logo?: string | null;
  bankAccount?: string | null;
}

const MobileCompanyPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [logo, setLogo] = useState<string | null>(null);

  // Obtener datos de la empresa
  const { data: company, isLoading } = useQuery<CompanyData>({
    queryKey: ["/api/company"],
    retry: false,
    staleTime: 0,
    gcTime: 0
  });

  // Configuración del formulario
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: company?.name || "",
      taxId: company?.taxId || "",
      address: company?.address || "",
      city: company?.city || "",
      postalCode: company?.postalCode || "",
      country: company?.country || "España",
      email: company?.email || "",
      phone: company?.phone || "",
      bankAccount: company?.bankAccount || "",
    },
  });

  // Actualizar el formulario cuando se cargan los datos
  useState(() => {
    if (company && !isLoading) {
      form.reset({
        name: company.name,
        taxId: company.taxId,
        address: company.address,
        city: company.city,
        postalCode: company.postalCode,
        country: company.country,
        email: company.email || "",
        phone: company.phone || "",
        bankAccount: company.bankAccount || "",
      });
      
      if (company.logo) {
        setLogo(company.logo);
      }
    }
  });

  // Mutación para guardar datos
  const saveCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      if (company?.id) {
        return apiRequest("PUT", `/api/company/${company.id}`, {
          ...data,
          logo
        });
      } else {
        return apiRequest("POST", "/api/company", {
          ...data,
          logo
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({
        title: company?.id ? "Datos actualizados" : "Empresa creada",
        description: "La información se ha guardado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `No se pudo guardar la información`,
        variant: "destructive",
      });
    },
  });

  // Manejar envío del formulario
  const onSubmit = (data: CompanyFormValues) => {
    saveCompanyMutation.mutate(data);
  };

  // Manejar carga de logo
  const handleLogoUpload = (path: string) => {
    setLogo(path);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header estilo iOS - minimalista */}
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button 
          onClick={() => navigate("/")} 
          className="flex items-center text-[#007AFF]"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Atrás</span>
        </button>
        {/* Se oculta el título "Mi empresa" que estaba aquí */}
      </header>

      <form onSubmit={form.handleSubmit(onSubmit)} className="pb-24">
        {/* Logo section - Versión con más vida */}
        <div className="bg-gradient-to-br from-blue-50 to-white p-5 flex flex-col items-center border-b">
          <div className="mb-3">
            {logo ? (
              <div className="h-24 w-24 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-blue-100 shadow-md relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent"></div>
                <img 
                  src={logo} 
                  alt="Logo" 
                  className="max-w-full max-h-full object-contain relative z-10"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                  }}
                />
              </div>
            ) : (
              <div className="h-24 w-24 rounded-xl border border-blue-100 flex items-center justify-center bg-gradient-to-br from-blue-50 to-white shadow-md">
                <Camera className="h-9 w-9 text-blue-400" />
              </div>
            )}
          </div>
          <div className="mt-2">
            <FileUpload 
              onUpload={handleLogoUpload}
              accept=".jpg,.jpeg,.png,.svg"
              buttonLabel="Cambiar logo"
              buttonClassName="bg-[#007AFF] hover:bg-blue-600 text-white rounded-full text-sm font-medium px-5 py-2 border-0 shadow-sm"
            />
          </div>
        </div>

        {/* Info sections */}
        <div className="divide-y divide-gray-100 space-y-3">
          {/* Información principal */}
          <section className="bg-white px-5 py-5 rounded-lg shadow-sm">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                <Building2 className="h-4 w-4 text-[#007AFF]" />
              </div>
              <h3 className="text-base font-medium text-gray-800">Información principal</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                <input
                  {...form.register("name")}
                  placeholder="Nombre de la empresa"
                  className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 shadow-sm"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">CIF/NIF</label>
                <input
                  {...form.register("taxId")}
                  placeholder="B12345678"
                  className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 shadow-sm"
                />
                {form.formState.errors.taxId && (
                  <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.taxId.message}</p>
                )}
              </div>
            </div>
          </section>
          
          {/* Contacto */}
          <section className="bg-white px-5 py-5 rounded-lg shadow-sm mt-3">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mr-3">
                <Phone className="h-4 w-4 text-green-500" />
              </div>
              <h3 className="text-base font-medium text-gray-800">Contacto</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  {...form.register("email")}
                  type="email"
                  placeholder="empresa@ejemplo.com"
                  className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-100 shadow-sm"
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                <input
                  {...form.register("phone")}
                  placeholder="+34 123 456 789"
                  className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-100 shadow-sm"
                />
              </div>
            </div>
          </section>
          
          {/* Dirección */}
          <section className="bg-white px-5 py-5 rounded-lg shadow-sm mt-3">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mr-3">
                <MapPin className="h-4 w-4 text-purple-500" />
              </div>
              <h3 className="text-base font-medium text-gray-800">Dirección fiscal</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
                <input
                  {...form.register("address")}
                  placeholder="Calle, número, piso..."
                  className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-100 shadow-sm"
                />
                {form.formState.errors.address && (
                  <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.address.message}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
                  <input
                    {...form.register("city")}
                    placeholder="Madrid"
                    className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-100 shadow-sm"
                  />
                  {form.formState.errors.city && (
                    <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.city.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">C.P.</label>
                  <input
                    {...form.register("postalCode")}
                    placeholder="28001"
                    className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-100 shadow-sm"
                  />
                  {form.formState.errors.postalCode && (
                    <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.postalCode.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">País</label>
                <input
                  {...form.register("country")}
                  placeholder="España"
                  className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-100 shadow-sm"
                />
                {form.formState.errors.country && (
                  <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.country.message}</p>
                )}
              </div>
            </div>
          </section>
          
          {/* Banco */}
          <section className="bg-white px-5 py-5 rounded-lg shadow-sm mt-3">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center mr-3">
                <CreditCard className="h-4 w-4 text-amber-500" />
              </div>
              <h3 className="text-base font-medium text-gray-800">Cuenta bancaria</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">IBAN</label>
              <input
                {...form.register("bankAccount")}
                placeholder="ES12 3456 7890 1234 5678 9012"
                className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-100 shadow-sm"
              />
              <p className="text-xs text-gray-500 mt-2 ml-1">
                Se incluirá automáticamente en tus facturas
              </p>
            </div>
          </section>
        </div>
      
        {/* Botón flotante estilo iOS */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <Button 
            type="submit"
            className="w-full bg-[#007AFF] hover:bg-blue-600 rounded-xl h-12 shadow-none"
            disabled={saveCompanyMutation.isPending}
          >
            {saveCompanyMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MobileCompanyPage;