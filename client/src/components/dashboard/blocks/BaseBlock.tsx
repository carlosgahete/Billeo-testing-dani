import React, { ReactNode } from "react";

interface BaseBlockProps {
  title: string;
  icon: ReactNode;
  bgColor?: string;
  iconColor?: string;
  children: ReactNode;
}

const BaseBlock: React.FC<BaseBlockProps> = ({ 
  title, 
  icon, 
  bgColor = "bg-blue-50", 
  iconColor = "text-blue-600",
  children 
}) => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm h-full flex flex-col bg-white">
      {/* Cabecera fija con altura fija - altura reducida en móvil */}
      <div className={`flex items-center p-3 ${bgColor} md:h-[56px] h-[50px]`}>
        <div className={`mr-2 ${iconColor}`}>
          {icon}
        </div>
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      {/* Contenido principal con altura elástica pero mínima - padding reducido en móvil */}
      <div className="md:p-4 p-3 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default BaseBlock;