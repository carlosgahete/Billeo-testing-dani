import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Image, Upload, X } from "lucide-react";

interface LogoUploadProps {
  initialLogo?: string | null;
  onUpload: (filePath: string) => void;
  onRemove?: () => void;
  accept?: string;
}

const LogoUpload = ({ 
  initialLogo,
  onUpload, 
  onRemove,
  accept = ".jpg,.jpeg,.png,.svg"
}: LogoUploadProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo || null);

  // Actualizar el logo si cambia desde props
  useEffect(() => {
    console.log("📸 LogoUpload - initialLogo actualizado:", initialLogo);
    setLogoUrl(initialLogo || null);
  }, [initialLogo]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que el archivo sea una imagen
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato no válido",
        description: "Por favor, selecciona una imagen",
        variant: "destructive",
      });
      return;
    }

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
      
      // Obtener la ruta al archivo
      const imagePath = data.path || `/uploads/${data.filename}`;
      setLogoUrl(imagePath);
      onUpload(imagePath);

      toast({
        title: "Logo subido",
        description: "El logo se ha subido correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error al subir el logo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="flex flex-col items-start space-y-2">
      {logoUrl ? (
        <div className="relative border rounded-md p-1 bg-gray-50 flex">
          <img 
            src={logoUrl} 
            alt="Logo" 
            className="h-16 object-contain max-w-[200px]" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-image.png';
              toast({
                title: "Error al cargar imagen",
                description: "No se pudo cargar la imagen. Verifica la ruta o sube otra.",
                variant: "destructive",
              });
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full bg-white text-red-500 hover:bg-red-50"
            onClick={handleRemoveLogo}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center">
          <Input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
            id="logo-upload"
          />
          <label htmlFor="logo-upload">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              className="cursor-pointer"
              onClick={() => document.getElementById("logo-upload")?.click()}
            >
              <Image className="h-4 w-4 mr-2" />
              {isUploading ? "Subiendo..." : "Subir logo"}
            </Button>
          </label>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        El logo aparecerá en la esquina superior derecha de la factura
      </p>
    </div>
  );
};

export default LogoUpload;