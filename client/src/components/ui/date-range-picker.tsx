import * as React from "react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePickerWithRange({
  value,
  onChange,
  className,
}: {
  value: DateRange | undefined;
  onChange: (date: DateRange | undefined) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "dd/MM/yyyy", { locale: es })} -{" "}
                  {format(value.to, "dd/MM/yyyy", { locale: es })}
                </>
              ) : (
                format(value.from, "dd/MM/yyyy", { locale: es })
              )
            ) : (
              <span>Selecciona un rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            locale={es}
          />
          <div className="p-3 border-t border-border flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                onChange({
                  from: new Date(today.getFullYear(), today.getMonth(), 1),
                  to: new Date(today.getFullYear(), today.getMonth() + 1, 0),
                });
              }}
            >
              Mes actual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                onChange({
                  from: new Date(today.getFullYear(), 0, 1),
                  to: new Date(today.getFullYear(), 11, 31),
                });
              }}
            >
              Año actual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange(undefined)}
            >
              Limpiar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}