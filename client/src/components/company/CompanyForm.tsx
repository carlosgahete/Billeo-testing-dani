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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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

  const onSubmit = (data: CompanyFormValues) => {
    saveCompanyMutation.mutate(data);
  };

  const handleLogoUpload = (path: string) => {
    setLogo(path);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Columna del logo */}
          <div className="md:col-span-1">
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg">
                <CardTitle className="text-lg font-semibold">Logo e Identidad</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center">
                <div className="w-full space-y-6">
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-center">
                    {logo ? (
                      <div className="w-full aspect-square max-w-[220px] rounded-lg shadow-sm overflow-hidden flex items-center justify-center bg-white p-3">
                        <img 
                          src={logo} 
                          alt="Logo de la empresa" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-square max-w-[220px] rounded-lg border-2 border-dashed border-blue-200 flex items-center justify-center bg-blue-50/50">
                        <div className="text-center p-4">
                          <svg className="mx-auto h-12 w-12 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          <p className="mt-1 text-sm text-blue-500">Sube el logo de tu empresa</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <FileUpload 
                    onUpload={handleLogoUpload}
                    accept=".jpg,.jpeg,.png,.svg"
                  />
                  <p className="text-xs text-neutral-500 text-center">
                    Formatos aceptados: JPG, PNG, SVG.<br />
                    Tamaño recomendado: 500x500px
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna de información principal */}
          <div className="md:col-span-2">
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg">
                <CardTitle className="text-lg font-semibold">Información de la Empresa</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Información principal */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Nombre de la empresa</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nombre de la empresa" 
                              {...field} 
                              className="border-blue-200 focus:border-blue-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">CIF/NIF</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="B12345678" 
                              {...field} 
                              className="border-blue-200 focus:border-blue-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Dirección</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Calle, número, piso..." 
                            {...field} 
                            className="border-blue-200 focus:border-blue-400"
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
                          <FormLabel className="text-sm font-medium">Ciudad</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ciudad" 
                              {...field} 
                              className="border-blue-200 focus:border-blue-400"
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
                          <FormLabel className="text-sm font-medium">Código postal</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="28001" 
                              {...field} 
                              className="border-blue-200 focus:border-blue-400"
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
                          <FormLabel className="text-sm font-medium">País</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="España" 
                              {...field} 
                              className="border-blue-200 focus:border-blue-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="empresa@ejemplo.com" 
                              {...field} 
                              className="border-blue-200 focus:border-blue-400"
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
                          <FormLabel className="text-sm font-medium">Teléfono</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+34 123 456 789" 
                              {...field} 
                              className="border-blue-200 focus:border-blue-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="bg-blue-50/60 p-4 rounded-lg border border-blue-100 shadow-sm">
                    <FormField
                      control={form.control}
                      name="bankAccount"
                      render={({ field }) => (
                        <FormItem className="mb-0">
                          <FormLabel className="text-sm font-medium text-blue-700">Número de cuenta bancaria (IBAN)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="ES12 3456 7890 1234 5678 9012" 
                              {...field} 
                              className="border-blue-200 focus:border-blue-400 bg-white"
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-blue-600 mt-2 font-medium">
                            Este número de cuenta se incluirá automáticamente en las notas de tus facturas junto con el texto "Pago mediante transferencia bancaria".
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={saveCompanyMutation.isPending}
            className="ml-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          >
            {saveCompanyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
