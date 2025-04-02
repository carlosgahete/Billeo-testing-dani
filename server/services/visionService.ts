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
      
      // Verificar si tenemos credenciales en variables de entorno
      if (!process.env.GOOGLE_CLOUD_CREDENTIALS) {
        throw new Error('No se encontraron credenciales de Google Cloud Vision');
      }
      
      // Parsear las credenciales JSON
      const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      
      // Crear cliente con credenciales explícitas
      visionClient = new ImageAnnotatorClient({
        credentials: credentials
      });
      
      console.log("Cliente de Vision API inicializado correctamente");
    } catch (error) {
      console.error('Error al inicializar Vision API client:', error);
      throw new Error(`No se pudo inicializar el cliente de Vision API: ${error.message}`);
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
  subtotal?: number;
  irpfAmount?: number;
  irpfRate?: number;
  ivaRate?: number;
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
  
  // Buscar importe total (mejorado para detectar cantidades grandes)
  const amountPatterns = [
    /total\s*\(?eur\)?:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /total:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /importe:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /total\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /a pagar:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /total a pagar\s*\(?eur\)?:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /total\s+\(?eur\)?:?\s*([\d.,]+[.,]?\d*)/i
  ];
  
  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      // Limpiar y convertir a número (manejo de diferentes formatos de números)
      let amountStr = match[1].trim();
      // Manejar formato europeo (1.234,56) y convertirlo a formato punto decimal
      if (amountStr.includes('.') && amountStr.includes(',')) {
        amountStr = amountStr.replace(/\./g, '').replace(',', '.');
      } else if (amountStr.includes(',')) {
        amountStr = amountStr.replace(',', '.');
      }
      amount = parseFloat(amountStr);
      console.log(`Importe detectado: ${amount}€`);
      break;
    }
  }
  
  // Buscar base imponible/subtotal
  const subtotalPatterns = [
    /base\s*imponible:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /subtotal:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /importe\s*neto:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /importe\s*sin\s*iva:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i
  ];
  
  let subtotal = 0;
  for (const pattern of subtotalPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      let subtotalStr = match[1].trim();
      if (subtotalStr.includes('.') && subtotalStr.includes(',')) {
        subtotalStr = subtotalStr.replace(/\./g, '').replace(',', '.');
      } else if (subtotalStr.includes(',')) {
        subtotalStr = subtotalStr.replace(',', '.');
      }
      subtotal = parseFloat(subtotalStr);
      console.log(`Base imponible/subtotal detectado: ${subtotal}€`);
      break;
    }
  }
  
  // Buscar IVA - Patrones mejorados para capturar todos los formatos comunes
  const taxPatterns = [
    // Patrón específico para "IVA 21% de 1.090,00 €228,90 €" 
    /iva\s+(\d+)%\s+de\s+[\d.,]+\s*[\€\$]?\s*([\d.,]+)/i,
    // Patrón para "IVA 21%: 228,90 €"
    /iva\s+(\d+)%:?\s*[\€\$]?\s*([\d.,]+)/i,
    // Patrón general para "IVA" seguido de un número
    /iva(?:\s+(\d+)%)?:?\s*[\€\$]?\s*([\d.,]+)/i,
    // Formato I.V.A.
    /i\.v\.a\.?(?:\s+(\d+)%)?:?\s*[\€\$]?\s*([\d.,]+)/i,
    // Palabra "impuesto" genérica
    /impuesto:?\s*[\€\$]?\s*([\d.,]+)/i
  ];
  
  let taxAmount = 0;
  let ivaRate = 21; // Valor por defecto
  
  for (const pattern of taxPatterns) {
    const match = normalizedText.match(pattern);
    console.log(`Probando patrón de IVA: ${pattern.toString()}`);
    if (match) {
      // Si el patrón captura el porcentaje del IVA (primer grupo)
      if (match[1]) {
        ivaRate = parseInt(match[1]);
        console.log(`Porcentaje de IVA detectado: ${ivaRate}%`);
      }
      
      // El último grupo captura siempre el monto
      const lastIndex = match.length - 1;
      if (match[lastIndex]) {
        console.log(`¡Coincidencia encontrada! Valor IVA: ${match[lastIndex]}`);
        // Limpiar y convertir a número 
        let taxStr = match[lastIndex].trim();
        if (taxStr.includes('.') && taxStr.includes(',')) {
          taxStr = taxStr.replace(/\./g, '').replace(',', '.');
        } else if (taxStr.includes(',')) {
          taxStr = taxStr.replace(',', '.');
        }
        taxAmount = parseFloat(taxStr);
        console.log(`IVA detectado: ${taxAmount}€`);
        break;
      }
    }
  }
  
  // Buscar IRPF
  const irpfPatterns = [
    /irpf\s+(\d+)%:?\s*-?\s*[\€\$]?\s*([\d.,]+)/i,
    /retencion(?:\s+(\d+)%)?:?\s*-?\s*[\€\$]?\s*([\d.,]+)/i,
    /retención(?:\s+(\d+)%)?:?\s*-?\s*[\€\$]?\s*([\d.,]+)/i,
    /ret\.?(?:\s+(\d+)%)?:?\s*-?\s*[\€\$]?\s*([\d.,]+)/i
  ];
  
  let irpfAmount = 0;
  let irpfRate = 15; // Valor por defecto
  
  for (const pattern of irpfPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      // Capturar porcentaje si está disponible
      if (match[1]) {
        irpfRate = parseInt(match[1]);
        console.log(`Porcentaje de IRPF detectado: ${irpfRate}%`);
      }
      
      // El último grupo siempre captura el monto
      const lastIndex = match.length - 1;
      if (match[lastIndex]) {
        console.log(`¡Coincidencia encontrada! Valor IRPF: ${match[lastIndex]}`);
        // Limpiar y convertir a número
        let irpfStr = match[lastIndex].trim();
        if (irpfStr.includes('.') && irpfStr.includes(',')) {
          irpfStr = irpfStr.replace(/\./g, '').replace(',', '.');
        } else if (irpfStr.includes(',')) {
          irpfStr = irpfStr.replace(',', '.');
        }
        irpfAmount = parseFloat(irpfStr);
        console.log(`IRPF detectado: ${irpfAmount}€`);
        break;
      }
    }
  }
  
  // Inferencias si no se encontraron valores explícitos
  
  // Si tenemos subtotal pero no importe total, calcular el total
  if (subtotal > 0 && amount === 0) {
    // Calcular el total a partir del subtotal + IVA - IRPF
    amount = subtotal + taxAmount - irpfAmount;
    console.log(`Importe total calculado: ${amount}€`);
  }
  
  // Si tenemos total pero no subtotal, calcular el subtotal
  if (amount > 0 && subtotal === 0) {
    // Si tenemos IVA y IRPF explícitos
    if (taxAmount > 0 || irpfAmount > 0) {
      subtotal = amount - taxAmount + irpfAmount;
      console.log(`Subtotal calculado: ${subtotal}€`);
    } else {
      // Estimar el subtotal basado en el IVA estándar
      subtotal = amount / (1 + (ivaRate / 100));
      taxAmount = amount - subtotal;
      console.log(`Subtotal estimado: ${subtotal.toFixed(2)}€ (asumiendo IVA ${ivaRate}%)`);
      console.log(`IVA estimado: ${taxAmount.toFixed(2)}€`);
    }
  }
  
  // Si tenemos subtotal e IVA, pero no el importe total
  if (subtotal > 0 && taxAmount > 0 && amount === 0) {
    amount = subtotal + taxAmount - irpfAmount;
    console.log(`Importe total calculado: ${amount}€`);
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
    /(?:descripcion|descripción)\s*.*?cantidad.*?precio.*?importe/i
  ];
  
  // Intentar encontrar concepto con los diferentes patrones
  // Primero intenta encontrar patrones con grupos de captura
  const match1 = text.match(conceptoPatterns[0]);
  if (match1 && match1[1]) {
    description = match1[1].trim();
    console.log(`Descripción/concepto detectado (patrón 1): ${description}`);
  } else {
    // Si encontramos la estructura de una tabla, buscar líneas específicas
    if (text.match(conceptoPatterns[1])) {
      // Buscar en el texto líneas que puedan ser conceptos de factura
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.length > 5 && 
            !/total|importe|subtotal|iva|fecha|factura|numero/i.test(line) &&
            /[a-z]{5,}/i.test(line)) {
          description = line.trim();
          console.log(`Descripción/concepto detectado (patrón tabla): ${description}`);
          break;
        }
      }
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
    taxAmount,
    subtotal,
    irpfAmount,
    irpfRate,
    ivaRate
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
  // Construir notas detalladas con la información fiscal
  let taxDetails = [];
  
  const subtotal = extractedData.subtotal || 0;
  const taxAmount = extractedData.taxAmount || 0;
  const irpfAmount = extractedData.irpfAmount || 0;
  const ivaRate = extractedData.ivaRate || 21;
  const irpfRate = extractedData.irpfRate || 15;
  
  // Crear impuestos adicionales si hay IRPF detectado
  let additionalTaxes = null;
  if (irpfAmount > 0) {
    // Crear un array con los impuestos adicionales
    additionalTaxes = JSON.stringify([
      {
        name: 'IRPF',
        amount: -irpfRate, // Negativo porque es una retención
        isPercentage: true
      }
    ]);
  }
  
  if (subtotal > 0) {
    taxDetails.push(`Base imponible: ${subtotal.toFixed(2)}€`);
  }
  
  if (taxAmount > 0) {
    taxDetails.push(`IVA (${ivaRate}%): ${taxAmount.toFixed(2)}€`);
  }
  
  if (irpfAmount > 0) {
    taxDetails.push(`IRPF (${irpfRate}%): -${irpfAmount.toFixed(2)}€`);
  }
  
  const notesText = `Extraído automáticamente de una imagen/PDF. 
Vendedor: ${extractedData.vendor || 'No detectado'}. 
${taxDetails.join('. ')}`;
  
  // Si detectamos IRPF, la descripción debería incluir esta información
  let description = extractedData.description;
  if (irpfAmount > 0 && !description.includes('IRPF')) {
    description += ` (con IRPF ${irpfRate}%)`;
  }
  
  // Aseguramos que todos los campos requeridos estén presentes
  return {
    userId: userId, // userId es integer en el esquema
    description: description,
    amount: extractedData.amount.toString(), // Convertir a string para el esquema decimal
    date: new Date(extractedData.date), // date es timestamp en el esquema
    type: 'expense' as const, // Usar 'as const' para asegurar que el tipo sea exactamente 'expense'
    categoryId,
    paymentMethod: 'other',
    notes: notesText,
    additionalTaxes: additionalTaxes
  };
}