import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { FormControl, FormField, FormItem } from "@/components/ui/form";

interface InvoiceItemRowProps {
  index: number;
  remove: (index: number) => void;
  onBlur: () => void;
}

export const InvoiceItemRow = ({ index, remove, onBlur }: InvoiceItemRowProps) => {
  const { control, watch } = useFormContext();
  
  // Observamos los valores de cantidad, precio y tasa de impuesto para calcular el total
  const quantity = watch(`items.${index}.quantity`) || "0";
  const unitPrice = watch(`items.${index}.unitPrice`) || "0";
  const taxRate = watch(`items.${index}.taxRate`) || "0";
  
  // Calculamos el total del ítem
  const calculateItemTotal = () => {
    const qty = parseFloat(quantity.toString());
    const price = parseFloat(unitPrice.toString());
    const tax = parseFloat(taxRate.toString()) / 100;
    
    if (isNaN(qty) || isNaN(price)) return "0.00";
    
    const subtotal = qty * price;
    const total = subtotal * (1 + tax);
    return total.toFixed(2);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      {/* Descripción */}
      <div className="col-span-5">
        <FormField
          control={control}
          name={`items.${index}.description`}
          render={({ field }) => (
            <FormItem className="m-0">
              <FormControl>
                <Input
                  {...field}
                  className="rounded-md border-muted bg-background focus-visible:ring-primary/10"
                  placeholder="Descripción del producto o servicio"
                  onBlur={onBlur}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      {/* Cantidad */}
      <div className="col-span-2">
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem className="m-0">
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  className="rounded-md border-muted bg-background focus-visible:ring-primary/10 text-center"
                  placeholder="1"
                  onBlur={onBlur}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      {/* Precio unitario */}
      <div className="col-span-2">
        <FormField
          control={control}
          name={`items.${index}.unitPrice`}
          render={({ field }) => (
            <FormItem className="m-0">
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  className="rounded-md border-muted bg-background focus-visible:ring-primary/10 text-center"
                  placeholder="0.00"
                  onBlur={onBlur}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      {/* Tasa de impuesto (IVA) */}
      <div className="col-span-1">
        <FormField
          control={control}
          name={`items.${index}.taxRate`}
          render={({ field }) => (
            <FormItem className="m-0">
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  className="rounded-md border-muted bg-background focus-visible:ring-primary/10 text-center"
                  placeholder="21"
                  onBlur={onBlur}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      {/* Total calculado */}
      <div className="col-span-1 text-center font-medium">
        {calculateItemTotal()}
      </div>
      
      {/* Botón para eliminar la fila */}
      <div className="col-span-1 text-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => remove(index)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};