import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Download } from "lucide-react";

interface MobileQuoteButtonsProps {
  onGeneratePDF: () => void;
}

export function MobileQuoteButtons({ onGeneratePDF }: MobileQuoteButtonsProps) {
  return (
    <div className="flex justify-between gap-3 fade-in mb-1 mt-0 px-2">
      <Link href="/quotes/create" className="flex-1">
        <Button 
          className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white font-medium rounded-xl h-10 text-sm px-4"
          size="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo
        </Button>
      </Link>
      <Button 
        className="flex-1 bg-[#5856D6] hover:bg-[#4645ab] text-white font-medium rounded-xl h-10 text-sm px-4" 
        onClick={onGeneratePDF}
        size="default"
      >
        <Download className="h-4 w-4 mr-2" />
        Descargar
      </Button>
    </div>
  );
}