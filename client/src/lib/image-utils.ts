/**
 * Convierte una URL de imagen en una cadena de datos (data URL)
 * @param url La URL de la imagen a convertir
 */
export async function getImageAsDataUrl(url: string): Promise<string> {
  try {
    console.log(`Intentando cargar imagen desde: ${url}`);
    
    // Crear un objeto de imagen
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Necesario para imágenes CORS
    
    // Esperar a que la imagen cargue
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => {
        console.error("Error cargando la imagen:", e);
        reject(new Error(`No se pudo cargar la imagen desde ${url}`));
      };
      img.src = url;
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
    console.log("Imagen convertida a data URL correctamente");
    
    return dataUrl;
  } catch (error) {
    console.error("Error en getImageAsDataUrl:", error);
    throw error;
  }
}