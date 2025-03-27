/**
 * Convierte una URL de imagen en una cadena de datos (data URL)
 * @param url La URL de la imagen a convertir
 */
export async function getImageAsDataUrl(url: string): Promise<string> {
  try {
    console.log(`Intentando cargar imagen desde: ${url}`);
    
    // Si la URL es relativa, asegurarnos que tiene el origen correcto
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    console.log(`URL completa para cargar la imagen: ${fullUrl}`);
    
    // Añadir timestamp para evitar la caché
    const timestampedUrl = fullUrl.includes('?') 
      ? `${fullUrl}&_t=${Date.now()}` 
      : `${fullUrl}?_t=${Date.now()}`;
    
    // Intentar primero cargar la imagen como un blob para evitar problemas CORS
    const response = await fetch(timestampedUrl, {
      cache: 'no-cache',
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      throw new Error(`Error cargando la imagen: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          console.log("Imagen convertida a data URL correctamente");
          resolve(reader.result);
        } else {
          reject(new Error("La conversión de la imagen a data URL falló"));
        }
      };
      reader.onerror = () => reject(new Error("Error leyendo la imagen como blob"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error en getImageAsDataUrl:", error);
    
    // Plan B: Intentar con el método tradicional usando Image y canvas
    try {
      console.log("Intentando cargar la imagen con método alternativo...");
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Necesario para imágenes CORS
      
      // Crear una URL temporal con un timestamp para evitar el caché
      const cachedUrl = url.includes('?') ? 
        `${url}&_t=${Date.now()}` : 
        `${url}?_t=${Date.now()}`;
      
      // Esperar a que la imagen cargue
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => {
          console.error("Error cargando la imagen (método alternativo):", e);
          reject(new Error(`No se pudo cargar la imagen desde ${cachedUrl}`));
        };
        img.src = cachedUrl;
      });
      
      // Crear un canvas para dibujar la imagen
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Dibujar la imagen en el canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("No se pudo crear el contexto 2D del canvas");
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Convertir el canvas a data URL
      const dataUrl = canvas.toDataURL("image/png");
      console.log("Imagen convertida a data URL correctamente (método alternativo)");
      
      return dataUrl;
    } catch (backupError) {
      console.error("Error en el método alternativo:", backupError);
      // Plan C: Si todo falla, devolver un mensaje de error visual
      return createErrorImageDataUrl("Error al cargar imagen");
    }
  }
}

/**
 * Crea una imagen de error como data URL
 * @param message Mensaje de error a mostrar en la imagen
 */
export function createErrorImageDataUrl(message: string): string {
  // Crear un canvas para dibujar la imagen de error
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 100;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "data:,Error"; // Fallback mínimo
  }
  
  // Fondo gris claro
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Borde
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  
  // Texto de error
  ctx.fillStyle = "#666666";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  
  // Convertir a data URL
  return canvas.toDataURL("image/png");
}