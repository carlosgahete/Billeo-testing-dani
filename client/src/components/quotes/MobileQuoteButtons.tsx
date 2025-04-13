import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Download } from "lucide-react";

interface MobileQuoteButtonsProps {
  onGeneratePDF: () => void;
}

export function MobileQuoteButtons({ onGeneratePDF }: MobileQuoteButtonsProps) {
  return (
    <div className="flex justify-between gap-2 fade-in my-4 mx-2 w-full sticky top-0 z-10 bg-white p-2 rounded-lg shadow-sm">
      <Link href="/quotes/create" className="flex-1">
        <Button className="w-full" size="default">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo presupuesto
        </Button>
      </Link>
      <Button 
        className="flex-1 bg-[#5856D6] hover:bg-[#4645ab]" 
        onClick={onGeneratePDF}
        size="default"
      >
        <Download className="h-4 w-4 mr-1" />
        Descargar resumen
      </Button>
    </div>
  );
}