import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedFileUploadProps {
  onFileAdded: (file: File) => void;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
  className?: string;
}

export default function EnhancedFileUpload({
  onFileAdded,
  maxSizeMB = 5,
  accept = '.jpg,.jpeg,.png,.pdf,.doc,.docx',
  label = 'Arrastra y suelta archivos o haz clic aquí',
  className
}: EnhancedFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convertir el maxSizeMB a bytes para la validación
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Funciones para manejar el arrastrar y soltar
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Comprobar si el tipo de archivo es aceptado
  const isFileTypeAccepted = (file: File): boolean => {
    if (!accept) return true;
    
    const fileType = file.type;
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    const acceptedTypes = accept.split(',').map(type => type.trim());
    
    return acceptedTypes.some(type => {
      // Comprobar por tipo MIME
      if (type.includes('/')) {
        return fileType === type || (type.endsWith('*') && fileType.startsWith(type.replace('*', '')));
      }
      // Comprobar por extensión
      return type === fileExtension;
    });
  };

  // Función para validar un archivo
  const validateFile = (file: File): boolean => {
    resetMessages();
    
    // Validar tamaño
    if (file.size > maxSizeBytes) {
      setError(`El archivo excede el tamaño máximo de ${maxSizeMB} MB`);
      return false;
    }
    
    // Validar tipo
    if (!isFileTypeAccepted(file)) {
      setError(`Tipo de archivo no permitido. Formatos aceptados: ${accept}`);
      return false;
    }
    
    return true;
  };

  // Función para manejar la subida del archivo
  const handleFile = (file: File) => {
    if (validateFile(file)) {
      onFileAdded(file);
      setSuccess(`Archivo "${file.name}" seleccionado correctamente`);
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    }
  };

  // Función para manejar el soltar archivo
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]; // Solo tomamos el primer archivo
      handleFile(file);
    }
  };

  // Función para manejar la selección de archivo mediante input
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]; // Solo tomamos el primer archivo
      handleFile(file);
    }
  };

  // Función para abrir el selector de archivos al hacer clic
  const onButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full p-6 transition-colors border border-dashed rounded-lg cursor-pointer",
          dragActive 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-300 bg-gray-50 hover:bg-gray-100",
          error ? "border-red-300 bg-red-50" : "",
          success ? "border-green-300 bg-green-50" : "",
          className
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept={accept}
        />
        
        {error ? (
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-10 h-10 mb-2 text-red-500" />
            <p className="text-sm font-medium text-red-600">{error}</p>
            <p className="mt-1 text-xs text-red-500">
              Haz clic para intentar con otro archivo
            </p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="w-10 h-10 mb-2 text-green-500" />
            <p className="text-sm font-medium text-green-600">{success}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <Upload className="w-10 h-10 mb-2 text-blue-500" />
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="mt-1 text-xs text-gray-500">
              Tamaño máximo: {maxSizeMB} MB | Formatos: {accept.replace(/\./g, ' ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}