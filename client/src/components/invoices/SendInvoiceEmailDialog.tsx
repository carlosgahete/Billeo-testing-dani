import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { generateInvoicePDFAsBase64 } from "@/lib/pdf";
import { useIsMobile } from "@/hooks/use-mobile";
import billeoLogo from '../../assets/billeo-logo.png';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2 } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes?: string;
  additionalTaxes?: any[] | null;
}

interface Client {
  id: number;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
}

interface Company {
  id: number;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  logo?: string;
}

interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  subtotal: number;
}

export function SendInvoiceEmailDialog({ 
  invoice, 
  client, 
  company,
  trigger
}: { 
  invoice: Invoice; 
  client: Client | null | undefined;
  company: Company | null | undefined;
  trigger?: React.ReactNode;
}) {
  // Asegurarse de que tenemos un cliente válido
  if (!client) {
    console.error("SendInvoiceEmailDialog: No se proporcionó un cliente válido");
    return null;
  }
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(client?.email || "");
  const [ccEmail, setCcEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const isMobile = useIsMobile();

  // Cargar los items de la factura cuando se abre el diálogo
  const { data: invoiceItems, isLoading: isLoadingItems } = useQuery<any[]>({
    queryKey: [`/api/invoices/${invoice.id}/items`],
    enabled: isOpen, // Solo cargar cuando el diálogo está abierto
  });

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      toast({
        title: "Email requerido",
        description: "Por favor, introduce un email de destinatario válido",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPending(true);
      
      // Si los datos de la empresa no incluyen un logo, usamos el logo por defecto de Billeo
      const logoPath = company?.logo || billeoLogo;
      
      console.log("Utilizando logo en email:", logoPath);
      
      // Generar PDF como base64 usando el logo
      const pdfBase64 = await generateInvoicePDFAsBase64(invoice, client, invoiceItems || [], logoPath);
      
      // Enviar el PDF por email
      const response = await apiRequest("POST", `/api/invoices/${invoice.id}/send-email`, {
        pdfBase64,
        recipientEmail,
        ccEmail: ccEmail || undefined
      });
      
      const result = await response.json();
      
      toast({
        title: "Email enviado",
        description: `La factura ${invoice.invoiceNumber} ha sido enviada a ${recipientEmail}`,
      });
      
      // Mostrar URL de vista previa si estamos en desarrollo
      if (result.previewUrl) {
        console.log("URL de vista previa del email:", result.previewUrl);
        
        // Abrir la vista previa en una nueva pestaña
        window.open(result.previewUrl, "_blank");
      }
      
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo enviar el email: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  // Agregar un manejador de clic para depuración
  const handleButtonClick = () => {
    console.log("Botón 'Enviar por email' presionado");
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-blue-600 hover:bg-blue-50"
                  onClick={handleButtonClick}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Enviar por email</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </DialogTrigger>
      <DialogContent className={isMobile ? "w-[95%] p-4 max-h-[90vh]" : "sm:max-w-md"}>
        <DialogHeader className={isMobile ? "mb-2" : ""}>
          <DialogTitle className={isMobile ? "text-base" : ""}>
            {isMobile ? `Enviar por email #${invoice.invoiceNumber}` : "Enviar factura por email"}
          </DialogTitle>
          {!isMobile && (
            <DialogDescription>
              Envía la factura {invoice.invoiceNumber} por correo electrónico al cliente.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className={`grid gap-${isMobile ? '2' : '4'} py-${isMobile ? '2' : '4'}`}>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-4'} items-center gap-2`}>
            {isMobile ? (
              <Label htmlFor="recipient" className="text-sm text-gray-600 mb-1">Para</Label>
            ) : (
              <Label htmlFor="recipient" className="text-right">Para</Label>
            )}
            <Input
              id="recipient"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className={isMobile ? "" : "col-span-3"}
            />
          </div>
          {!isMobile && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cc" className="text-right">CC</Label>
              <Input
                id="cc"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="opcional@correo.com"
                className="col-span-3"
              />
            </div>
          )}
          {!isMobile && (
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-4 text-sm text-muted-foreground">
                <p>El mensaje incluirá:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Un saludo personalizado al cliente</li>
                  <li>La factura {invoice.invoiceNumber} adjunta en PDF</li>
                  <li>Los datos de contacto de tu empresa</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className={isMobile ? "flex-col space-y-2 pt-2" : ""}>
          {isMobile && (
            <Button 
              type="submit" 
              onClick={handleSendEmail}
              disabled={isPending || isLoadingItems}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : isLoadingItems ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparando...
                </>
              ) : (
                "Enviar factura"
              )}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className={isMobile ? "w-full" : ""}
          >
            {isMobile ? "Cancelar" : "Cancelar"}
          </Button>
          {!isMobile && (
            <Button 
              type="submit" 
              onClick={handleSendEmail}
              disabled={isPending || isLoadingItems}
              className="min-w-[120px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : isLoadingItems ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparando...
                </>
              ) : (
                "Enviar factura"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}