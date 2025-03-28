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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la empresa" {...field} />
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
                    <FormLabel>CIF/NIF</FormLabel>
                    <FormControl>
                      <Input placeholder="B12345678" {...field} />
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
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle, número, piso..." {...field} />
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
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input placeholder="Ciudad" {...field} />
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
                    <FormLabel>Código postal</FormLabel>
                    <FormControl>
                      <Input placeholder="28001" {...field} />
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
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Input placeholder="España" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="empresa@ejemplo.com" {...field} />
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
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+34 123 456 789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormLabel>Logo de la empresa</FormLabel>
              <div className="mt-2 space-y-4">
                {logo && (
                  <div className="w-40 h-40 border rounded flex items-center justify-center p-2 bg-neutral-50">
                    <img 
                      src={logo} 
                      alt="Logo de la empresa" 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        // If image fails to load, show a placeholder
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                )}
                <FileUpload 
                  onUpload={handleLogoUpload}
                  accept=".jpg,.jpeg,.png,.svg"
                />
                <p className="text-xs text-neutral-500">
                  Sube una imagen para el logo de tu empresa. Formatos aceptados: JPG, PNG, SVG.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={saveCompanyMutation.isPending}
            className="ml-auto"
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
