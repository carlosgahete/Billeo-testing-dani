/**
 * Servicio para gestionar el almacenamiento de archivos
 * Este servicio proporciona funciones para subir, descargar y visualizar archivos
 */

import { toast } from "@/hooks/use-toast";

// Interfaces
export interface FileMetadata {
  filename: string;       // Nombre del archivo en el servidor
  originalName: string;   // Nombre original del archivo
  path: string;           // Ruta completa para acceder al archivo
  size: number;           // Tamaño en bytes
  mimeType: string;       // Tipo MIME
  uploadDate: string;     // Fecha de subida
  fileType: 'image' | 'pdf' | 'document' | 'other'; // Tipo categorizado
  thumbnailPath?: string; // Ruta a la miniatura (si existe)
}

// Tipos de entidades asociables
export type EntityType = 'expense' | 'invoice' | 'quote' | 'client' | 'company';

// Función para subir un archivo
export const uploadFile = async (
  file: File,
  entityType?: EntityType,
  entityId?: number
): Promise<FileMetadata | null> => {
  try {
    // Verificación básica
    if (!file) {
      throw new Error('No se ha seleccionado ningún archivo');
    }
    
    // Verificar tamaño (5MB máximo)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new Error('El archivo excede el tamaño máximo permitido (5MB)');
    }
    
    // Verificar tipo de archivo
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG), PDF y documentos Word.');
    }
    
    // Crear FormData
    const formData = new FormData();
    formData.append('file', file);
    
    // Añadir metadatos como parámetros
    if (entityType) formData.append('entityType', entityType);
    if (entityId) formData.append('entityId', entityId.toString());
    
    // Subir archivo
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al subir el archivo');
    }
    
    const data = await response.json();
    
    // Determinar tipo de archivo
    let fileType: 'image' | 'pdf' | 'document' | 'other' = 'other';
    if (file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (file.type === 'application/pdf') {
      fileType = 'pdf';
    } else if (file.type.includes('word') || file.type.includes('document')) {
      fileType = 'document';
    }
    
    // Crear y devolver metadata
    const fileMetadata: FileMetadata = {
      filename: data.filename,
      originalName: file.name,
      path: data.path,
      size: file.size,
      mimeType: file.type,
      uploadDate: new Date().toISOString(),
      fileType,
      thumbnailPath: fileType === 'image' ? data.path : undefined
    };
    
    return fileMetadata;
    
  } catch (error: any) {
    console.error('Error al subir el archivo:', error);
    toast({
      title: 'Error al subir el archivo',
      description: error.message || 'Ha ocurrido un error al subir el archivo',
      variant: 'destructive'
    });
    return null;
  }
};

// Función para visualizar un archivo
export const viewFile = (filePath: string): void => {
  try {
    // Extraer solo el nombre del archivo sin la ruta
    const filename = filePath.split('/').pop();
    if (!filename) {
      throw new Error('Ruta de archivo inválida');
    }
    
    // Abrir archivo en nueva pestaña
    window.open(`/api/view-file/${filename}`, '_blank');
    
  } catch (error: any) {
    console.error('Error al visualizar el archivo:', error);
    toast({
      title: 'Error al visualizar el archivo',
      description: error.message || 'No se pudo abrir el archivo',
      variant: 'destructive'
    });
  }
};

// Función para descargar un archivo
export const downloadFile = (filePath: string, customName?: string): void => {
  try {
    // Extraer solo el nombre del archivo sin la ruta
    const filename = filePath.split('/').pop();
    if (!filename) {
      throw new Error('Ruta de archivo inválida');
    }
    
    // Crear URL para descarga
    const downloadUrl = `/api/download/${filename}`;
    
    // Si se proporciona un nombre personalizado, agregarlo como parámetro
    const urlWithParams = customName 
      ? `${downloadUrl}?customName=${encodeURIComponent(customName)}`
      : downloadUrl;
    
    // Abrir en una nueva pestaña para descarga
    window.open(urlWithParams, '_blank');
    
  } catch (error: any) {
    console.error('Error al descargar el archivo:', error);
    toast({
      title: 'Error al descargar el archivo',
      description: error.message || 'No se pudo descargar el archivo',
      variant: 'destructive'
    });
  }
};

// Función para eliminar un archivo (solo marca para eliminación en el servidor)
export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    // Extraer solo el nombre del archivo sin la ruta
    const filename = filePath.split('/').pop();
    if (!filename) {
      throw new Error('Ruta de archivo inválida');
    }
    
    // Enviar solicitud para eliminar
    const response = await fetch(`/api/files/${filename}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al eliminar el archivo');
    }
    
    toast({
      title: 'Archivo eliminado',
      description: 'El archivo ha sido eliminado correctamente',
    });
    
    return true;
    
  } catch (error: any) {
    console.error('Error al eliminar el archivo:', error);
    toast({
      title: 'Error al eliminar el archivo',
      description: error.message || 'No se pudo eliminar el archivo',
      variant: 'destructive'
    });
    return false;
  }
};

// Función para obtener una URL de vista previa para un archivo
export const getPreviewUrl = (filePath: string): string => {
  // Si es una ruta completa, extraer solo el nombre del archivo
  const filename = filePath.startsWith('/uploads/') 
    ? filePath.split('/').pop() || ''
    : filePath;
    
  // Devolver URL para vista previa
  return `/api/view-file/${filename}`;
};

// Función utilitaria para determinar si un archivo es una imagen
export const isImageFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
};

// Función utilitaria para determinar si un archivo es un PDF
export const isPdfFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
};

// Función para formatear el tamaño del archivo
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};