// client/src/components/invoices/InvoiceValidationAlert.tsx
import { useState } from "react";
import { AlertCircle, Check, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface InvoiceValidationAlertProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  hasClient: boolean;
  hasAmount: boolean;
  hasTaxes: boolean;
  hasExemptionReason: boolean;
}

const InvoiceValidationAlert = ({
  show,
  onClose,
  onSubmit,
  hasClient,
  hasAmount,
  hasTaxes,
  hasExemptionReason,
}: InvoiceValidationAlertProps) => {
  const [userConfirmed, setUserConfirmed] = useState(false);

  const handleSubmit = () => {
    setUserConfirmed(true);
    onSubmit();
  };

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-amber-700">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            Datos incompletos en la factura
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Hay algunos datos importantes que faltan o no son válidos en tu factura. Por favor revisa los siguientes puntos:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            {!hasClient && (
              <div className="flex items-start gap-2 text-red-700 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">Cliente no seleccionado</p>
                  <p className="text-sm text-red-600">
                    Debes seleccionar un cliente para la factura
                  </p>
                </div>
              </div>
            )}

            {!hasAmount && (
              <div className="flex items-start gap-2 text-red-700 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">Base imponible cero</p>
                  <p className="text-sm text-red-600">
                    El importe total de la factura no puede ser cero
                  </p>
                </div>
              </div>
            )}

            {!hasTaxes && !hasExemptionReason && (
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-md">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Sin impuestos ni exención</p>
                  <p className="text-sm text-amber-600">
                    La factura no tiene impuestos aplicados (IVA/IRPF) ni incluye un motivo de exención en las notas
                  </p>
                </div>
              </div>
            )}

            {hasClient && hasAmount && (hasTaxes || hasExemptionReason) && (
              <div className="flex items-start gap-2 text-green-700 bg-green-50 p-3 rounded-md">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Todo correcto</p>
                  <p className="text-sm text-green-600">
                    La factura cumple con todos los requisitos básicos
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={userConfirmed}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {userConfirmed ? "Procesando..." : "Confirmar y guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceValidationAlert;