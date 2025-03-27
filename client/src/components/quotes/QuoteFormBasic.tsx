import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";

// Props del componente
interface QuoteFormBasicProps {
  quoteId?: number;
}

const QuoteFormBasic = ({ quoteId }: QuoteFormBasicProps) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditMode = !!quoteId;

  // Estados para el formulario
  const [quoteNumber, setQuoteNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { description: "", quantity: "1", unitPrice: "0", taxRate: "21" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar clientes
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: getQueryFn() as () => Promise<any[]>,
  });

  // Función para agregar un nuevo item
  const addItem = () => {
    setItems([...items, { description: "", quantity: "1", unitPrice: "0", taxRate: "21" }]);
  };

  // Función para eliminar un item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  // Función para actualizar un item
  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Calcular subtotal, IVA y total
  const calculateTotals = () => {
    let subtotal = 0;
    let tax = 0;

    items.forEach(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      
      const itemSubtotal = quantity * price;
      subtotal += itemSubtotal;
      tax += itemSubtotal * (taxRate / 100);
    });

    // IRPF fijo a -15% del subtotal
    const irpf = subtotal * (-0.15);
    const total = subtotal + tax + irpf;

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      additionalTaxes: [
        {
          name: "IRPF",
          amount: "-15",
          isPercentage: true
        }
      ]
    };
  };

  // Mutación para guardar el presupuesto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validar campos obligatorios
      if (!quoteNumber.trim()) {
        throw new Error("El número de presupuesto es obligatorio");
      }
      if (!clientId) {
        throw new Error("Debe seleccionar un cliente");
      }
      if (items.some(item => !item.description.trim())) {
        throw new Error("Todos los conceptos deben tener una descripción");
      }

      // Calcular totales
      const totals = calculateTotals();

      // Construir objeto con datos del presupuesto
      const quoteData = {
        quoteNumber,
        clientId: Number(clientId),
        status,
        notes,
        items: items.map(item => ({
          ...item,
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: (parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2)
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        additionalTaxes: totals.additionalTaxes,
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      // Enviar petición
      const endpoint = isEditMode ? `/api/quotes/${quoteId}` : "/api/quotes";
      const method = isEditMode ? "PUT" : "POST";
      const res = await apiRequest(method, endpoint, quoteData);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al guardar el presupuesto");
      }

      // Éxito
      toast({
        title: isEditMode ? "Presupuesto actualizado" : "Presupuesto creado",
        description: isEditMode
          ? "El presupuesto ha sido actualizado correctamente."
          : "El presupuesto ha sido creado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      navigate("/quotes");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Calcular totales para mostrar
  const totals = calculateTotals();
  const subtotalDisplay = formatCurrency(parseFloat(totals.subtotal));
  const taxDisplay = formatCurrency(parseFloat(totals.tax));
  const irpfDisplay = formatCurrency(parseFloat(totals.subtotal) * -0.15);
  const totalDisplay = formatCurrency(parseFloat(totals.total));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode ? "Editar presupuesto" : "Nuevo presupuesto"}
          </CardTitle>
          <CardDescription>
            Completa la información básica del presupuesto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="quoteNumber">Número de presupuesto</Label>
              <Input
                id="quoteNumber"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                placeholder="P-0001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente</Label>
              <Select
                value={clientId}
                onValueChange={setClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={status}
              onValueChange={setStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="accepted">Aceptado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Por ejemplo: Las condiciones de pago son 50% por adelantado, resto a la entrega..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Conceptos a facturar</CardTitle>
            <CardDescription>
              Añade los diferentes productos o servicios
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            size="sm"
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-12 gap-4 font-medium text-sm px-2 py-2 bg-muted border-b">
            <div className="col-span-6">Descripción</div>
            <div className="col-span-2 text-center">Cantidad</div>
            <div className="col-span-2 text-center">Precio</div>
            <div className="col-span-1 text-center">IVA</div>
            <div className="col-span-1 text-right"></div>
          </div>
          
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-center text-sm px-2 py-2 rounded-md bg-white border">
              <div className="col-span-6">
                <Input 
                  placeholder="Ej: Diseño web, Consultoría, etc."
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="border-none shadow-none focus-visible:ring-0 px-0 py-1 h-9"
                />
              </div>
              
              <div className="col-span-2">
                <Input 
                  type="text"
                  inputMode="numeric"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="text-center border-none shadow-none focus-visible:ring-0 px-0 py-1 h-9"
                />
              </div>
              
              <div className="col-span-2">
                <Input 
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const cleanValue = e.target.value.replace(/[€$,\s]/g, '');
                    updateItem(index, 'unitPrice', cleanValue);
                  }}
                  className="text-center border-none shadow-none focus-visible:ring-0 px-0 py-1 h-9"
                />
              </div>
              
              <div className="col-span-1">
                <Input 
                  type="text"
                  inputMode="numeric"
                  value={item.taxRate}
                  onChange={(e) => updateItem(index, 'taxRate', e.target.value)}
                  className="text-center border-none shadow-none focus-visible:ring-0 px-0 py-1 h-9"
                />
              </div>
              
              <div className="col-span-1 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Eliminar</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen y totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-1/2 ml-auto space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{subtotalDisplay}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">IVA:</span>
              <span className="font-medium">{taxDisplay}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">IRPF (-15%):</span>
              <span className="font-medium">{irpfDisplay}</span>
            </div>
            <div className="flex justify-between py-3 border-t mt-2 pt-3">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold text-primary">{totalDisplay}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate("/quotes")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="px-8">
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </span>
            ) : isEditMode ? (
              "Guardar cambios"
            ) : (
              "Crear presupuesto"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default QuoteFormBasic;