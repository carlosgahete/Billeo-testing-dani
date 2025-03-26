import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  onUpload: (filePath: string) => void;
  accept?: string;
}

const FileUpload = ({ onUpload, accept = ".pdf,.jpg,.jpeg,.png" }: FileUploadProps) => {
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
      
      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente",
      });

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
    <div className="flex items-center space-x-2">
      <Input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={isUploading}
        className="max-w-xs"
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          className="cursor-pointer"
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Subiendo..." : "Seleccionar archivo"}
        </Button>
      </label>
    </div>
  );
};

export default FileUpload;
