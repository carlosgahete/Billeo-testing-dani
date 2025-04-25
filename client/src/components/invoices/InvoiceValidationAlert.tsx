import { useEffect, useState } from "react";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  ShieldAlert 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ValidationItem {
  id: string;
  label: string;
  valid: boolean;
  required: boolean;
  message?: string;
}

interface InvoiceValidationAlertProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  hasClient: boolean;
  hasAmount: boolean;
  hasTaxes: boolean;
  hasExemptionReason: boolean;
  hasDate: boolean;
  inProgress: boolean;
}

export function InvoiceValidationAlert({
  show,
  onClose,
  onSubmit,
  hasClient,
  hasAmount,
  hasTaxes,
  hasExemptionReason,
  hasDate,
  inProgress
}: InvoiceValidationAlertProps) {
  const [validationItems, setValidationItems] = useState<ValidationItem[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);

  // Actualizar validaciones cuando cambien las props
  useEffect(() => {
    const items: ValidationItem[] = [
      {
        id: "client",
        label: "Cliente",
        valid: hasClient,
        required: true,
        message: "Debes seleccionar o crear un cliente válido"
      },
      {
        id: "amount",
        label: "Importe base (Base imponible)",
        valid: hasAmount,
        required: true,
        message: "El importe debe ser mayor que cero"
      },
      {
        id: "taxes",
        label: "Impuestos (IVA/IRPF) o Exención",
        valid: hasTaxes || hasExemptionReason,
        required: true,
        message: "Debes añadir impuestos o indicar motivo de exención"
      },
      {
        id: "date",
        label: "Fecha de factura",
        valid: hasDate,
        required: true,
        message: "Debes establecer una fecha válida para la factura"
      }
    ];

    setValidationItems(items);
    
    // Comprobar si se puede enviar la factura
    const requiredItems = items.filter(item => item.required);
    const validRequiredItems = requiredItems.filter(item => item.valid);
    setCanSubmit(validRequiredItems.length === requiredItems.length);
  }, [hasClient, hasAmount, hasTaxes, hasExemptionReason, hasDate]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Verificación de la factura</h2>
          </div>
          
          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle>Verificando campos obligatorios</AlertTitle>
            <AlertDescription className="text-sm text-gray-600">
              Antes de crear la factura, comprueba que has completado todos los campos obligatorios.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 mb-6">
            {validationItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                {item.valid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{item.label}</p>
                  {!item.valid && (
                    <p className="text-sm text-red-600">{item.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!canSubmit && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle>No se puede crear la factura</AlertTitle>
              <AlertDescription className="text-sm text-gray-600">
                Por favor, completa los campos marcados en rojo antes de continuar.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose} disabled={inProgress}>
              Cancelar
            </Button>
            <Button 
              onClick={onSubmit} 
              disabled={!canSubmit || inProgress}
              className={!canSubmit ? "opacity-50 cursor-not-allowed" : ""}
            >
              {inProgress ? "Creando factura..." : "Crear factura"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}