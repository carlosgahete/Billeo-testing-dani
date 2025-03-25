import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';
import { createCanvas, loadImage } from 'canvas';
import * as pdfjs from 'pdfjs-dist';
import * as pdfParse from 'pdf-parse';
import { InsertTransaction } from '@shared/schema';

// La ruta al archivo de credenciales JSON
const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS || '';
let credentials;

try {
  // Interpretamos las credenciales como JSON
  credentials = JSON.parse(credentialsJson);
} catch (error) {
  console.error('Error al parsear credenciales:', error);
}

// Cliente de Vision API
const visionClient = new ImageAnnotatorClient({
  credentials,
});

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

    // Ejecutar OCR en la imagen
    const [result] = await visionClient.textDetection(imagePath);
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
 * Extrae información de gastos del texto usando heurísticas
 */
function extractExpenseInfo(text: string): ExtractedExpense {
  // Normalizar texto: convertir a minúsculas y eliminar acentos
  const normalizedText = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  // Buscar fecha
  const dateRegex = /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/g;
  // Usar match en lugar de matchAll para compatibilidad
  const dateMatches = normalizedText.match(dateRegex) || [];
  
  let date = new Date().toISOString().split('T')[0]; // Fecha actual por defecto
  if (dateMatches.length > 0) {
    // Usar la primera fecha encontrada
    const firstDateMatch = dateMatches[0];
    // Extraer los componentes usando grupos de captura
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
  
  // Buscar importe total
  // Buscamos patrones comunes para importes totales
  const amountPatterns = [
    /total:?\s*[\€\$]?\s*(\d+[.,]\d+)/i,
    /importe:?\s*[\€\$]?\s*(\d+[.,]\d+)/i,
    /total\s*[\€\$]?\s*(\d+[.,]\d+)/i,
    /a pagar:?\s*[\€\$]?\s*(\d+[.,]\d+)/i,
    /[\€\$]\s*(\d+[.,]\d+)/
  ];
  
  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      // Limpiar y convertir a número
      amount = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }
  
  // Buscar IVA
  const taxPatterns = [
    /iva (?:\d+%)?\s*[\€\$]?\s*(\d+[.,]\d+)/i,
    /i\.v\.a\.?\s*[\€\$]?\s*(\d+[.,]\d+)/i,
    /impuesto:?\s*[\€\$]?\s*(\d+[.,]\d+)/i
  ];
  
  let taxAmount = 0;
  for (const pattern of taxPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      taxAmount = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }
  
  // Buscar empresa/vendedor
  // Generalmente está en las primeras líneas
  const lines = text.split('\n');
  let vendor = '';
  if (lines.length > 0) {
    vendor = lines[0].trim();
    // Si la primera línea parece una dirección, tomar la segunda
    if (/calle|avda|plaza|c\/|av\./i.test(vendor) && lines.length > 1) {
      vendor = lines[1].trim();
    }
  }
  
  // Generar una descripción basada en el vendedor y otros datos
  let description = vendor ? `Compra en ${vendor}` : 'Gasto detectado por IA';
  
  // Determinar posible categoría basada en palabras clave
  let categoryHint;
  
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
  } else {
    categoryHint = 'Otros';
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
): Partial<InsertTransaction> {
  return {
    userId: userId.toString(), // Convertir a string
    description: extractedData.description,
    amount: extractedData.amount,
    date: new Date(extractedData.date), // Convertir a Date
    type: 'expense',
    categoryId,
    paymentMethod: 'other',
    notes: `Extraído automáticamente de una imagen/PDF. Vendedor: ${extractedData.vendor || 'No detectado'}. IVA estimado: ${extractedData.taxAmount || 0}€`
  };
}