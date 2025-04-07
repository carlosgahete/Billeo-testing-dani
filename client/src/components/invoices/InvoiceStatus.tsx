import React from "react";
import { Badge } from "@/components/ui/badge";

interface InvoiceStatusProps {
  status: string;
  className?: string;
}

export const InvoiceStatus = ({ status, className }: InvoiceStatusProps) => {
  let badgeVariant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | null
    | undefined = "default";
  let textColor = "";
  let label = "";

  switch (status.toLowerCase()) {
    case "paid":
    case "pagada":
      badgeVariant = "default";
      textColor = "text-green-700 bg-green-100 border-green-200 hover:bg-green-200";
      label = "Pagada";
      break;
    case "pending":
    case "pendiente":
      badgeVariant = "secondary";
      textColor = "text-amber-700 bg-amber-100 border-amber-200 hover:bg-amber-200";
      label = "Pendiente";
      break;
    case "overdue":
    case "vencida":
      badgeVariant = "destructive";
      textColor = "text-red-700 bg-red-100 border-red-200 hover:bg-red-200";
      label = "Vencida";
      break;
    case "draft":
    case "borrador":
      badgeVariant = "outline";
      textColor = "text-gray-700 bg-gray-100 border-gray-200 hover:bg-gray-200";
      label = "Borrador";
      break;
    case "canceled":
    case "cancelada":
      badgeVariant = "outline";
      textColor = "text-gray-700 bg-gray-100 border-gray-200 hover:bg-gray-200 line-through";
      label = "Cancelada";
      break;
    default:
      badgeVariant = "outline";
      textColor = "";
      label = status;
  }

  return (
    <Badge variant={badgeVariant} className={`font-medium ${textColor} ${className}`}>
      {label}
    </Badge>
  );
};