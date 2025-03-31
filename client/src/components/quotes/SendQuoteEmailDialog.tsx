import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateQuotePDF } from "@/lib/pdf";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";

interface SendQuoteEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  client: any;
  quoteItems: any[];
  companyInfo: any;
}

export function SendQuoteEmailDialog({
  open,
  onOpenChange,
  quote,
  client,
  quoteItems,
  companyInfo,
}: SendQuoteEmailDialogProps) {
  const { toast } = useToast();
  const [emailToSend, setEmailToSend] = useState(client?.email || "");
  const [ccEmail, setCcEmail] = useState("");
  const [sendCopy, setSendCopy] = useState(false);

  // Mutación para enviar el correo electrónico
  const sendEmailMutation = useMutation({
    mutationFn: async ({
      quoteId,
      pdfBase64,
      emailToSend,
      ccEmail,
    }: {
      quoteId: number;
      pdfBase64: string;
      emailToSend: string;
      ccEmail?: string;
    }) => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/send-email`, {
        pdfBase64,
        recipientEmail: emailToSend,
        ccEmail: ccEmail || undefined,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error sending email");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Presupuesto enviado",
        description: "El presupuesto ha sido enviado por correo electrónico correctamente",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo enviar el correo electrónico: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Función para manejar el envío
  const handleSendEmail = async () => {
    if (!emailToSend) {
      toast({
        title: "Error",
        description: "Por favor, introduce una dirección de correo electrónico válida",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generar el PDF como base64
      const pdfBase64 = await generateQuotePDF(
        quote,
        client,
        quoteItems,
        { returnAsBase64: true } // Devuelve como base64 en lugar de descarga
      );

      // Enviar el correo electrónico si tenemos el pdf en base64
      if (typeof pdfBase64 === 'string') {
        sendEmailMutation.mutate({
          quoteId: quote.id,
          pdfBase64,
          emailToSend,
          ccEmail: sendCopy ? companyInfo?.email : ccEmail,
        });
      } else {
        throw new Error("No se pudo generar el PDF correctamente");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo generar el PDF: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enviar presupuesto por correo electrónico</DialogTitle>
          <DialogDescription>
            Introduce la dirección de correo electrónico del destinatario para enviar el presupuesto.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo electrónico del cliente</Label>
            <Input
              id="email"
              placeholder="email@ejemplo.com"
              value={emailToSend}
              onChange={(e) => setEmailToSend(e.target.value)}
              type="email"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ccEmail">CC (opcional)</Label>
            <Input
              id="ccEmail"
              placeholder="cc@ejemplo.com"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              type="email"
              disabled={sendCopy}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendCopy"
              checked={sendCopy}
              onCheckedChange={(checked) => {
                setSendCopy(checked as boolean);
                if (checked) {
                  setCcEmail("");
                }
              }}
            />
            <Label htmlFor="sendCopy" className="text-sm">
              Enviarme una copia a mi correo ({companyInfo?.email || "sin configurar"})
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendEmailMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={!emailToSend || sendEmailMutation.isPending}
            className="ml-2"
          >
            {sendEmailMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar presupuesto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}