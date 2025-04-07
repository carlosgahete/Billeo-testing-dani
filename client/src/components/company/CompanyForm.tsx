import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Loader2, Camera, Building2, MapPin, Phone, Mail, CreditCard, RefreshCcw } from "lucide-react";
import FileUpload from "@/components/common/FileUpload";
import { Company } from "@shared/schema";

// Aseguramos que los tipos de datos sean correctos
interface CompanyData extends Partial<Company> {
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
  id?: number;
}

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

const CompanyForm = () => {
  const { toast } = useToast();
  const [logo, setLogo] = useState<string | null>(null);
  
  const { data: company, isLoading } = useQuery<CompanyData>({
    queryKey: ["/api/company"],
    retry: false,
    staleTime: 0,
    gcTime: 0
  });

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      taxId: "",
      address: "",
      city: "",
      postalCode: "",
      country: "España",
      email: "",
      phone: "",
      bankAccount: "",
    },
  });

  // Update form values when company data is loaded
  // Usamos useEffect en lugar de useState para actualizar el formulario cuando cambian los datos
  // useState no es correcto para efectos secundarios y puede causar problemas de persistencia
  useEffect(() => {
    if (company && !isLoading) {
      console.log('Actualizando formulario con datos de empresa:', company);
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
  }, [company, isLoading, form]);

  const saveCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      if (company) {
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
        title: company ? "Empresa actualizada" : "Empresa creada",
        description: company 
          ? "La información de la empresa se ha actualizado correctamente" 
          : "La empresa se ha creado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Ha ocurrido un error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const syncIbanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/company/sync-iban", {});
    },
    onSuccess: (data: { updatedCount: number; message: string; success: boolean }) => {
      toast({
        title: "IBAN sincronizado",
        description: `Se han actualizado ${data.updatedCount} facturas con el IBAN actual`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al sincronizar IBAN",
        description: `No se pudieron actualizar las facturas: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSyncIban = () => {
    syncIbanMutation.mutate();
  };

  const onSubmit = (data: CompanyFormValues) => {
    saveCompanyMutation.mutate(data);
  };

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Sección de información principal */}
        <div className="space-y-8">
          {/* Nombre y Logo */}
          <div className="backdrop-blur-sm bg-white/80 rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center mb-5 space-x-3">
              <div className="rounded-full bg-blue-50 p-2">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Información principal</h3>
            </div>

            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel className="text-sm font-medium text-gray-700">Nombre de la empresa</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nombre de la empresa" 
                          {...field} 
                          className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">CIF/NIF</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="B12345678" 
                            {...field} 
                            className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex flex-col items-center space-y-3 min-w-[140px]">
                {logo ? (
                  <div className="h-24 w-24 rounded-2xl overflow-hidden flex items-center justify-center bg-white border border-gray-100 shadow-sm">
                    <img 
                      src={logo} 
                      alt="Logo" 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-2xl border border-gray-200 flex items-center justify-center bg-gray-50">
                    <Camera className="h-10 w-10 text-gray-300" />
                  </div>
                )}
                
                <div className="flex-shrink-0">
                  <FileUpload 
                    onUpload={handleLogoUpload}
                    accept=".jpg,.jpeg,.png,.svg"
                    buttonLabel="Subir logo"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    JPG, PNG o SVG
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sección de contacto */}
          <div className="backdrop-blur-sm bg-white/80 rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center mb-5 space-x-3">
              <div className="rounded-full bg-green-50 p-2">
                <Mail className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Información de contacto</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="empresa@ejemplo.com" 
                          {...field}
                          className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+34 123 456 789" 
                          {...field}
                          className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
          
          {/* Sección de dirección */}
          <div className="backdrop-blur-sm bg-white/80 rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center mb-5 space-x-3">
              <div className="rounded-full bg-purple-50 p-2">
                <MapPin className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Dirección fiscal</h3>
            </div>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Dirección</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Calle, número, piso..." 
                        {...field}
                        className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Ciudad</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ciudad" 
                          {...field}
                          className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Código postal</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="28001" 
                          {...field}
                          className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">País</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="España" 
                          {...field}
                          className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
          
          {/* Sección bancaria */}
          <div className="backdrop-blur-sm bg-white/80 rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center mb-5 space-x-3">
              <div className="rounded-full bg-amber-50 p-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Información bancaria</h3>
            </div>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="bankAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Número de cuenta bancaria (IBAN)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ES04 0182 5322 2902 0848 5903" 
                        {...field}
                        className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Este número de cuenta se incluirá automáticamente en las notas de tus facturas.
                    </p>
                  </FormItem>
                )}
              />
              
              {company && company.bankAccount && (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSyncIban}
                    disabled={syncIbanMutation.isPending}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 focus:ring-amber-100 mt-2 text-sm shadow-sm"
                  >
                    {syncIbanMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Sincronizar IBAN en facturas existentes
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    Usa este botón si necesitas actualizar manualmente el IBAN en todas tus facturas existentes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={saveCompanyMutation.isPending}
            className="shadow-sm bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-5 py-2 h-auto rounded-lg transition-all"
          >
            {saveCompanyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CompanyForm;
