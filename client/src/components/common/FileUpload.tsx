import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Upload } from "lucide-react";

interface FileUploadProps {
  onUpload: (filePath: string) => void;
  accept?: string;
  compact?: boolean;
}

const FileUpload = ({ onUpload, accept = ".pdf,.jpg,.jpeg,.png", compact = false }: FileUploadProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Solo mostrar toast si no estamos en modo compacto
      if (!compact) {
        toast({
          title: "Archivo subido",
          description: "El archivo se ha subido correctamente",
        });
      }

      onUpload(data.path);
    } catch (error: any) {
      toast({
        title: "Error al subir el archivo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  return (
    <div className="flex items-center">
      <Input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button
          type="button"
          variant={compact ? "ghost" : "outline"}
          size="sm"
          disabled={isUploading}
          className={`cursor-pointer whitespace-nowrap ${compact ? 'px-2 h-8' : ''}`}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          {compact ? (
            <>
              <Paperclip className="h-4 w-4" />
              {isUploading && <span className="ml-1 text-xs">...</span>}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Subiendo..." : "Seleccionar archivo"}
            </>
          )}
        </Button>
      </label>
    </div>
  );
};

export default FileUpload;
