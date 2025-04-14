import { apiRequest } from '@/lib/queryClient';

// Verificamos si window está definido para manejar SSR
const isClient = typeof window !== 'undefined';

interface FileMetadata {
  id: number;
  userId: number;
  filename: string;
  originalName: string;
  path: string;
  size: string;
  mimeType: string;
  fileType: string;
  entityType: string | null;
  entityId: number | null;
  uploadDate: string;
  thumbnailPath: string | null;
}

export const fileStorageService = {
  /**
   * Sube un archivo al servidor
   */
  async uploadFile(formData: FormData): Promise<string> {
    try {
      // En este caso necesitamos usar fetch directamente para el FormData
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        // No incluir Content-Type para que el navegador establezca el límite correcto para FormData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir el archivo');
      }
      
      const data = await response.json();
      return data.filePath;
    } catch (error) {
      console.error('Error en el servicio de subida de archivos:', error);
      throw error;
    }
  },

  /**
   * Elimina un archivo del servidor
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await apiRequest("DELETE", '/api/files/delete', { filePath });
      // apiRequest ya maneja los errores internamente
    } catch (error) {
      console.error('Error en el servicio de eliminación de archivos:', error);
      throw error;
    }
  },

  /**
   * Descarga un archivo del servidor
   */
  async downloadFile(filePath: string): Promise<void> {
    try {
      // Crear una URL del archivo para descargar
      const downloadUrl = `/api/files/download?filePath=${encodeURIComponent(filePath)}`;
      
      // Abrir la URL en una nueva pestaña o descargar directamente
      if (isClient) {
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Error en el servicio de descarga de archivos:', error);
      throw error;
    }
  },

  /**
   * Obtiene la URL para previsualizar un archivo
   */
  async getFilePreviewUrl(filePath: string): Promise<string> {
    try {
      // Crear una URL del archivo para previsualizar
      return `/api/files/preview?filePath=${encodeURIComponent(filePath)}`;
    } catch (error) {
      console.error('Error al obtener URL de previsualización:', error);
      throw error;
    }
  },

  /**
   * Versión sincrónica para obtener la URL de previsualización (útil para atributos src)
   */
  getFilePreviewUrlSync(filePath: string): string {
    return `/api/files/preview?filePath=${encodeURIComponent(filePath)}`;
  },

  /**
   * Obtiene los metadatos de un archivo
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      // Usamos fetch directamente para manejar errores 404
      const response = await fetch(`/api/files/metadata?filePath=${encodeURIComponent(filePath)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Archivo no encontrado
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener metadatos del archivo');
      }
      
      const data = await response.json();
      return data.metadata;
    } catch (error) {
      console.error('Error al obtener metadatos del archivo:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los archivos asociados a una entidad
   */
  async getFilesByEntity(entityType: string, entityId: number): Promise<string[]> {
    try {
      // Como apiRequest ahora devuelve los datos JSON directamente
      const response = await fetch(`/api/files/by-entity?entityType=${entityType}&entityId=${entityId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener archivos');
      }
      
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error al obtener archivos por entidad:', error);
      throw error;
    }
  },
};

export default fileStorageService;