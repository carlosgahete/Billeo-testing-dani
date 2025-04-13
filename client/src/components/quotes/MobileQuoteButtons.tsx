import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Download } from "lucide-react";

interface MobileQuoteButtonsProps {
  onGeneratePDF: () => void;
}

export function MobileQuoteButtons({ onGeneratePDF }: MobileQuoteButtonsProps) {
  return (
    <div className="flex justify-between gap-1 fade-in mb-0 mt-0 mx-0 w-full p-0 z-10">
      <Link href="/quotes/create" className="flex-1">
        <Button 
          className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white font-medium rounded-xl h-9 text-xs px-2"
          size="sm"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nuevo
        </Button>
      </Link>
      <Button 
        className="flex-1 bg-[#5856D6] hover:bg-[#4645ab] text-white font-medium rounded-xl h-9 text-xs px-2" 
        onClick={onGeneratePDF}
        size="sm"
      >
        <Download className="h-3.5 w-3.5 mr-1" />
        Descargar
      </Button>
    </div>
  );
}