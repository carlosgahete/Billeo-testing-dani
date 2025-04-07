import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

interface AdditionalTaxFieldProps {
  index: number;
  remove: (index: number) => void;
  onBlur: () => void;
}

export const AdditionalTaxField = ({ index, remove, onBlur }: AdditionalTaxFieldProps) => {
  const { control, watch } = useFormContext();
  
  // Observamos los valores de nombre y tipo de impuesto
  const name = watch(`additionalTaxes.${index}.name`) || "";
  const type = watch(`additionalTaxes.${index}.type`) || "percentage";
  const value = watch(`additionalTaxes.${index}.value`) || "0";

  return (
    <div className="flex items-end space-x-2 mb-2">
      {/* Nombre del impuesto */}
      <div className="flex-1">
        <FormField
          control={control}
          name={`additionalTaxes.${index}.name`}
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">Nombre</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="h-8 text-sm"
                  placeholder="IRPF"
                  onBlur={onBlur}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      {/* Tipo de impuesto (porcentaje o cantidad fija) */}
      <div className="w-24">
        <FormField
          control={control}
          name={`additionalTaxes.${index}.type`}
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">Tipo</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onBlur={onBlur}
                >
                  <option value="percentage">%</option>
                  <option value="fixed">€</option>
                </select>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      {/* Valor del impuesto */}
      <div className="w-20">
        <FormField
          control={control}
          name={`additionalTaxes.${index}.value`}
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">Valor</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="h-8 text-sm text-right"
                  placeholder={type === "percentage" ? "15" : "50"}
                  onBlur={onBlur}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      {/* Botón para eliminar el impuesto */}
      <div className="pb-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => remove(index)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};