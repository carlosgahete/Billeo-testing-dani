import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';
import { createCanvas, loadImage } from 'canvas';
import * as pdfjs from 'pdfjs-dist';
import pdfParse from './pdf-parser';
import { InsertTransaction } from '@shared/schema';

// Configuración del cliente de Vision API
// Inicializar como undefined para inicialización diferida
let visionClient: ImageAnnotatorClient | undefined;

// Función para obtener o inicializar el cliente Vision
function getVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    try {
      console.log("Inicializando Vision API client bajo demanda...");
      // Crear una instancia básica para mantener la aplicación funcionando
      visionClient = new ImageAnnotatorClient();
    } catch (error) {
      console.error('Error al inicializar Vision API client:', error);
      throw new Error('No se pudo inicializar el cliente de Vision API');
    }
  }
  return visionClient;
}

// Interfaz para los resultados procesados
export interface ExtractedExpense {
  date: string;
  description: string;
  amount: number;
  categoryHint?: string;
  vendor?: string;
  taxAmount?: number;
}

/**
 * Procesa una imagen y extrae datos de facturas/recibos
 */
export async function processReceiptImage(imagePath: string): Promise<ExtractedExpense> {
  try {
    console.log(`Procesando imagen: ${imagePath}`);

    // Ejecutar OCR en la imagen usando el cliente inicializado bajo demanda
    const client = getVisionClient();
    const [result] = await client.textDetection(imagePath);
    const detections = result.textAnnotations || [];
    
    if (detections.length === 0) {
      throw new Error('No se detectó texto en la imagen');
    }

    // El primer elemento contiene todo el texto
    const fullText = detections[0].description || '';
    console.log('Texto detectado:', fullText);

    // Extraer información relevante del texto
    return extractExpenseInfo(fullText);
  } catch (error) {
    console.error('Error al procesar la imagen:', error);
    throw error;
  }
}

/**
 * Procesa un PDF y extrae datos de facturas/recibos
 */
export async function processReceiptPDF(pdfPath: string): Promise<ExtractedExpense> {
  try {
    console.log(`Procesando PDF: ${pdfPath}`);
    
    // Leer el PDF
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    
    // Extraer el texto
    const fullText = pdfData.text;
    console.log('Texto extraído del PDF:', fullText);
    
    // Extraer información relevante del texto
    return extractExpenseInfo(fullText);
  } catch (error) {
    console.error('Error al procesar el PDF:', error);
    throw error;
  }
}

/**
 * Extrae información de gastos del texto usando heurísticas mejoradas
 */
function extractExpenseInfo(text: string): ExtractedExpense {
  // Normalizar texto: convertir a minúsculas y eliminar acentos
  const normalizedText = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  // Buscar fecha
  const dateRegex = /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/g;
  const dateMatches = normalizedText.match(dateRegex) || [];
  
  let date = new Date().toISOString().split('T')[0]; // Fecha actual por defecto
  
  if (dateMatches.length > 0) {
    // Usar la primera fecha encontrada
    const firstDateMatch = dateMatches[0];
    // Extraer los componentes usando grupos de captura
    if (firstDateMatch) {
      const dateComponents = firstDateMatch.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/) || [];
      
      if (dateComponents.length >= 4) {
        const day = dateComponents[1].padStart(2, '0');
        const month = dateComponents[2].padStart(2, '0');
        let year = dateComponents[3];
        
        // Ajustar el año si es de dos dígitos
        if (year.length === 2) {
          year = `20${year}`;
        }
        
        date = `${year}-${month}-${day}`;
      }
    }
  }
  
  // Buscar importe total
  const amountPatterns = [
    /total\s*\(?eur\)?:?\s*[\€\$]?\s*([\d.,]+)/i,
    /total:?\s*[\€\$]?\s*([\d.,]+)/i,
    /importe:?\s*[\€\$]?\s*([\d.,]+)/i,
    /total\s*[\€\$]?\s*([\d.,]+)/i,
    /a pagar:?\s*[\€\$]?\s*([\d.,]+)/i
  ];
  
  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      // Limpiar y convertir a número
      amount = parseFloat(match[1].replace(',', '.'));
      console.log(`Importe detectado: ${amount}€`);
      break;
    }
  }
  
  // Buscar IVA - Patrones mejorados para capturar todos los formatos comunes
  const taxPatterns = [
    // Patrón específico para "IVA 21% de 1.090,00 €228,90 €" 
    /iva\s+\d+%\s+de\s+[\d.,]+\s*[\€\$]?\s*([\d.,]+)/i,
    // Patrón para "IVA 21%: 228,90 €"
    /iva\s+\d+%:?\s*[\€\$]?\s*([\d.,]+)/i,
    // Patrón general para "IVA" seguido de un número
    /iva(?:\s+\d+%)?:?\s*[\€\$]?\s*([\d.,]+)/i,
    // Formato I.V.A.
    /i\.v\.a\.?(?:\s+\d+%)?:?\s*[\€\$]?\s*([\d.,]+)/i,
    // Palabra "impuesto" genérica
    /impuesto:?\s*[\€\$]?\s*([\d.,]+)/i
  ];
  
  let taxAmount = 0;
  for (const pattern of taxPatterns) {
    const match = normalizedText.match(pattern);
    console.log(`Probando patrón de IVA: ${pattern.toString()}`);
    if (match && match[1]) {
      console.log(`¡Coincidencia encontrada! Valor: ${match[1]}`);
      // Limpiar y convertir a número (sustituir tanto punto como coma por punto decimal)
      taxAmount = parseFloat(match[1].replace(',', '.'));
      console.log(`IVA detectado: ${taxAmount}€`);
      break;
    }
  }
  
  // Si no se encontró un valor de IVA, intentar calcularlo como 21% del importe
  if (taxAmount === 0 && amount > 0) {
    console.log("No se encontró el IVA explícitamente, intentando calcularlo...");
    // Buscar porcentaje de IVA en el texto
    const ivaPercentMatch = normalizedText.match(/iva\s+(\d+)%/i);
    let ivaPercent = 21; // Por defecto 21% si no se especifica
    
    if (ivaPercentMatch && ivaPercentMatch[1]) {
      ivaPercent = parseInt(ivaPercentMatch[1]);
      console.log(`Porcentaje de IVA detectado: ${ivaPercent}%`);
    }
    
    // Estimar el valor del IVA (se puede ajustar este cálculo según sea necesario)
    const subtotal = amount / (1 + (ivaPercent / 100));
    taxAmount = amount - subtotal;
    console.log(`IVA calculado: ${taxAmount.toFixed(2)}€ (${ivaPercent}% de ${subtotal.toFixed(2)}€)`);
  }
  
  // Buscar empresa/vendedor con mayor precisión
  const lines = text.split('\n');
  let vendor = '';
  
  // Buscar patrones de NIF/CIF en el texto para identificar al emisor
  const cifPattern = /(?:cif|nif|c\.i\.f|n\.i\.f)(?:\s*:)?\s*([a-z0-9]{8,9})/i;
  const cifMatch = normalizedText.match(cifPattern);
  
  if (cifMatch && cifMatch[1]) {
    const emisorCIF = cifMatch[1];
    console.log(`CIF/NIF de emisor detectado: ${emisorCIF}`);
    
    // Buscar el nombre asociado a este CIF, suele estar en la línea anterior o posterior
    const cifPosition = normalizedText.indexOf(emisorCIF.toLowerCase());
    if (cifPosition > 0) {
      // Obtener contexto alrededor del CIF (3 líneas antes y después)
      const contextLines = normalizedText.substring(
        Math.max(0, normalizedText.lastIndexOf('\n', cifPosition) - 150),
        normalizedText.indexOf('\n', cifPosition + 50) + 1
      ).split('\n');
      
      // Buscar línea que parezca nombre de empresa (evitando líneas que sean direcciones)
      for (const line of contextLines) {
        if (line.length > 4 && 
            !/calle|avda|plaza|c\/|av\.|cp|codigo postal|:/.test(line) &&
            !/\d{5}/.test(line)) { // Evitar códigos postales
          vendor = line.trim();
          console.log(`Posible nombre de emisor encontrado cerca del CIF: ${vendor}`);
          break;
        }
      }
    }
  }
  
  // Si no se encontró vendedor por CIF, intentar por posición en el documento
  if (!vendor) {
    // Buscar líneas que parezcan nombres de empresas al principio del documento
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      if (line.length > 3 && 
          !/calle|avda|plaza|c\/|av\.|cp|codigo postal|fecha|factura|numero|importe|total/.test(line.toLowerCase()) &&
          !/^\d+/.test(line)) { // Evitar líneas que empiecen con números
        vendor = line;
        console.log(`Vendedor detectado por posición: ${vendor}`);
        break;
      }
    }
  }
  
  // Buscar concepto o descripción en la factura
  let description = '';
  
  // Intentar detectar "concepto" o "descripción" en la factura o buscar en la tabla
  const conceptoPatterns = [
    /(?:concepto|descripci[oó]n)\s*:?\s*([^\n]+)/i,
    /DESCRIPCI[ÓO]N[\s\w]*?CANTIDAD[\s\w]*?PRECIO[\s\w]*?IMPORTE.*?\n(.*?)\d+/is
  ];
  
  // Intentar encontrar concepto con los diferentes patrones
  for (const pattern of conceptoPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      description = match[1].trim();
      console.log(`Descripción/concepto detectado: ${description}`);
      break;
    }
  }
  
  // Si no se encontró concepto, usar el vendedor
  if (!description) {
    description = vendor ? `Servicio de ${vendor}` : 'Servicio profesional';
  }
  
  // Determinar posible categoría basada en palabras clave
  let categoryHint = 'Otros';
  
  if (/restaurante|cafe|bar|menu|comer|comida|bebida/i.test(normalizedText)) {
    categoryHint = 'Restaurantes';
  } else if (/gasolina|gasolinera|combustible|diesel|repsol|cepsa|bp/i.test(normalizedText)) {
    categoryHint = 'Transporte';
  } else if (/supermercado|mercadona|carrefour|lidl|aldi|dia|eroski|hipercor/i.test(normalizedText)) {
    categoryHint = 'Supermercado';
  } else if (/telefono|telefonia|movil|factura|recibo|vodafone|movistar|orange/i.test(normalizedText)) {
    categoryHint = 'Servicios';
  } else if (/hotel|alojamiento|booking|airbnb/i.test(normalizedText)) {
    categoryHint = 'Viajes';
  } else if (/comision|asesoria|consultoria|servicios profesionales|relaciones/i.test(normalizedText)) {
    categoryHint = 'Servicios Profesionales';
  }
  
  return {
    date,
    description,
    amount,
    categoryHint,
    vendor,
    taxAmount
  };
}

/**
 * Convierte los datos extraídos a un objeto de transacción
 */
export function mapToTransaction(
  extractedData: ExtractedExpense, 
  userId: number, 
  categoryId: number | null
): InsertTransaction {
  // Aseguramos que todos los campos requeridos estén presentes
  return {
    userId: userId, // userId es integer en el esquema
    description: extractedData.description,
    amount: extractedData.amount.toString(), // Convertir a string para el esquema decimal
    date: new Date(extractedData.date), // date es timestamp en el esquema
    type: 'expense' as const, // Usar 'as const' para asegurar que el tipo sea exactamente 'expense'
    categoryId,
    paymentMethod: 'other',
    notes: `Extraído automáticamente de una imagen/PDF. Vendedor: ${extractedData.vendor || 'No detectado'}. IVA estimado: ${extractedData.taxAmount || 0}€`
  };
}