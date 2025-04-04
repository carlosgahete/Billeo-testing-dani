import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings, Filter, Trash2 } from "lucide-react";

interface DashboardBlockMenuProps {
  onDelete: () => void;
  onConfigure?: () => void;
  onFilter?: () => void;
}

const DashboardBlockMenu: React.FC<DashboardBlockMenuProps> = ({
  onDelete,
  onConfigure,
  onFilter,
}) => {
  return (
    <div className="absolute top-2 right-2 flex items-center space-x-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <TooltipProvider delayDuration={300}>
        {onFilter && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200"
                onClick={onFilter}
              >
                <Filter className="h-4 w-4 text-neutral-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Filtrar</p>
            </TooltipContent>
          </Tooltip>
        )}

        {onConfigure && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200"
                onClick={onConfigure}
              >
                <Settings className="h-4 w-4 text-neutral-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Configurar</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Eliminar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default DashboardBlockMenu;