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
export function getVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    try {
      console.log("Inicializando Vision API client bajo demanda...");
      
      // Verificar si tenemos credenciales en variables de entorno
      if (!process.env.GOOGLE_CLOUD_CREDENTIALS) {
        throw new Error('No se encontraron credenciales de Google Cloud Vision');
      }
      
      // Intentar detectar si es una API key o un JSON de credenciales
      const apiKeyPattern = /^[A-Za-z0-9_-]+$/;
      const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
      
      // Comprobar si parece una API key simple
      if (apiKeyPattern.test(credentials)) {
        console.log("Usando API key para Vision API");
        // Usar la API key directamente
        visionClient = new ImageAnnotatorClient({
          apiKey: credentials
        });
      } else {
        // Intentar parsear como JSON
        try {
          const credentialsJson = JSON.parse(credentials);
          visionClient = new ImageAnnotatorClient({
            credentials: credentialsJson
          });
        } catch (jsonError) {
          console.error('Error al parsear credenciales como JSON:', jsonError);
          // Intentar como último recurso usarla como API key
          visionClient = new ImageAnnotatorClient({
            apiKey: credentials
          });
        }
      }
      
      console.log("Cliente de Vision API inicializado correctamente");
    } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('Error al procesar el PDF:', error);
    throw error;
  }
}

/**
 * Extrae información de gastos del texto usando heurísticas mejoradas
 */
/**
 * Extrae información detallada de facturas de gastos de un texto usando análisis OCR
 * Mejorado para detectar correctamente la Base Imponible, IVA e IRPF según los requisitos
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
    /total\s*a\s*pagar\s*:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
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
  
  // Buscar base imponible/subtotal - Mejorado según requisitos
  const subtotalPatterns = [
    /base\s*imponible\s*:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
    /base\s*:?\s*[\€\$]?\s*([\d.,]+[.,]?\d*)/i,
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
    // Patrón para formatos de tabla en facturas (IVA en paréntesis)
    /iva\s*\((\d+)[.,]?(\d*)\s*%\)[^\d]*(\d+[.,]\d+)/i,
    // Patrón específico para "IVA 21% de 1.090,00 €228,90 €" 
    /iva\s+(\d+)%\s+de\s+[\d.,]+\s*[\€\$]?\s*([\d.,]+)/i,
    // Patrón para "IVA 21%: 228,90 €"
    /iva\s+(\d+)%:?\s*[\€\$]?\s*([\d.,]+)/i,
    // Patrón para "IVA (21 %): 522,06 €"
    /iva\s*\(\s*(\d+)\s*%\s*\):?\s*[\€\$]?\s*([\d.,]+)/i,
    // Patrón general para "IVA" seguido de un número
    /iva(?:\s+(\d+)%)?:?\s*[\€\$]?\s*([\d.,]+)/i,
    // Formato I.V.A.
    /i\.v\.a\.?(?:\s+(\d+)%)?:?\s*[\€\$]?\s*([\d.,]+)/i,
    // Buscar línea que contenga "IVA" y un número con símbolo de euro
    /iva.*?(\d+[.,]\d+)\s*€/i,
    // Palabra "impuesto" genérica
    /impuesto:?\s*[\€\$]?\s*([\d.,]+)/i
  ];
  
  let taxAmount = 0;
  let ivaRate = 21; // Valor por defecto
  
  console.log("=== BUSCANDO IVA EN LA FACTURA ===");
  for (const pattern of taxPatterns) {
    const match = normalizedText.match(pattern);
    console.log(`Probando patrón de IVA: ${pattern.toString()}`);
    if (match) {
      console.log(`✅ Coincidencia encontrada con patrón: ${pattern.toString()}`);
      console.log(`Texto coincidente: "${match[0]}"`);
      console.log(`Grupos capturados: ${JSON.stringify(match.slice(1))}`);
      
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
  
  // Buscar IRPF - Mejorado para facturas de gastos según requisitos
  // En facturas de gastos, el IRPF es una deducción (valor negativo)
  const irpfPatterns = [
    // Patrón específico para formato "IRPF (15 %): -372,90 €"
    /irpf\s*\(\s*(\d+)\s*%\s*\):?\s*-?\s*[\€\$]?\s*([\d.,]+)/i,
    // Patrón para formatos como "IRPF (15%) -372,90 €"
    /irpf\s*\(\s*(\d+)[.,]?(\d*)\s*%\)[^\d]*-?(\d+[.,]\d+)/i,
    // Patrón para línea con IRPF y valor negativo con signo menos
    /irpf.*?-\s*(\d+[.,]\d+)\s*€/i,
    // Patrones genéricos
    /irpf\s+\(?-?(\d+)%\)?:?\s*-?\s*[\€\$]?\s*([\d.,]+)/i,
    /irpf(?:\s+\(?-?(\d+)%\)?)?:?\s*-?\s*[\€\$]?\s*([\d.,]+)/i,
    // Patrones para retención
    /retencion(?:\s+\(?-?(\d+)%\)?)?:?\s*-?\s*[\€\$]?\s*([\d.,]+)/i,
    /retención(?:\s+\(?-?(\d+)%\)?)?:?\s*-?\s*[\€\$]?\s*([\d.,]+)/i,
    /ret\.?(?:\s+\(?-?(\d+)%\)?)?:?\s*-?\s*[\€\$]?\s*([\d.,]+)/i
  ];
  
  let irpfAmount = 0;
  let irpfRate = 15; // Valor por defecto
  
  console.log("=== BUSCANDO IRPF EN LA FACTURA ===");
  console.log(`Texto a analizar: "${normalizedText.substring(0, 200)}..."`);

  for (const pattern of irpfPatterns) {
    const match = normalizedText.match(pattern);
    console.log(`Probando patrón de IRPF: ${pattern.toString()}`);
    if (match) {
      console.log(`✅ Coincidencia encontrada con patrón: ${pattern.toString()}`);
      console.log(`Texto coincidente: "${match[0]}"`);
      console.log(`Grupos capturados: ${JSON.stringify(match.slice(1))}`);
      
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
        // En facturas de gastos, el IRPF debe ser positivo para cálculos internos
        if (irpfAmount < 0) {
          irpfAmount = Math.abs(irpfAmount);
        }
        console.log(`IRPF detectado: ${irpfAmount}€`);
        break;
      }
    }
  }
  
  // Verificar si el documento contiene patrones que indiquen que es una factura con IRPF
  const hasIrpfIndicators = /irpf|retencion|retención|profesional|autónomo|autonomo/i.test(normalizedText);
  
  // Inferencias si no se encontraron valores explícitos
  
  // Si tenemos subtotal pero no IVA, calcularlo
  if (subtotal > 0 && taxAmount === 0) {
    // Calcular IVA basado en la tasa estándar
    taxAmount = subtotal * (ivaRate / 100);
    console.log(`IVA calculado: ${taxAmount.toFixed(2)}€ (${ivaRate}% de ${subtotal}€)`);
  }
  
  // Si tenemos subtotal, posibles indicadores de IRPF, pero no monto de IRPF, calcularlo
  if (subtotal > 0 && hasIrpfIndicators && irpfAmount === 0) {
    irpfAmount = subtotal * (irpfRate / 100);
    console.log(`IRPF calculado: ${irpfAmount.toFixed(2)}€ (${irpfRate}% de ${subtotal}€)`);
  }
  
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
      // Fórmula: Base imponible = Total / (1 + (IVA% / 100))
      subtotal = amount / (1 + (ivaRate / 100));
      taxAmount = amount - subtotal;
      console.log(`Subtotal estimado: ${subtotal.toFixed(2)}€ (asumiendo IVA ${ivaRate}%)`);
      console.log(`IVA estimado: ${taxAmount.toFixed(2)}€`);
      
      // Si hay indicadores de IRPF, estimar también el IRPF
      if (hasIrpfIndicators) {
        irpfAmount = subtotal * (irpfRate / 100);
        console.log(`IRPF estimado: ${irpfAmount.toFixed(2)}€ (${irpfRate}% de ${subtotal.toFixed(2)}€)`);
      }
    }
  }
  
  // Verificación de coherencia: Total debe ser Base + IVA - IRPF
  const calculatedTotal = parseFloat((subtotal + taxAmount - irpfAmount).toFixed(2));
  if (Math.abs(amount - calculatedTotal) > 0.1) {
    console.log(`⚠️ Advertencia: El total (${amount}€) no coincide con Base + IVA - IRPF (${calculatedTotal}€)`);
    // Ajustar el total si la diferencia es significativa
    if (Math.abs(amount - calculatedTotal) > 1) {
      console.log(`⚠️ Ajustando total para mantener coherencia fiscal`);
      amount = calculatedTotal;
    }
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
 * Verifica un gasto manual con IA para determinar si es coherente
 */
export async function verifyExpenseWithAI(expenseData: {
  description: string;
  amount: string;
}): Promise<{
  isValid: boolean;
  suggestion?: string;
  categoryHint?: string;
}> {
  try {
    const client = getVisionClient();
    
    // Crear un mensaje para que la IA analice
    const prompt = `Analiza el siguiente gasto empresarial:
    Descripción: ${expenseData.description}
    Importe: ${expenseData.amount}€
    
    Proporciona un análisis sobre si este gasto parece correcto y coherente. 
    Considera si el importe parece razonable para el tipo de gasto descrito.
    Si pudieras categorizar este gasto para contabilidad, ¿en qué categoría lo pondrías?
    
    Responde en formato JSON con los siguientes campos:
    {
      "isValid": true o false,
      "reason": "explicación breve",
      "suggestion": "sugerencia de mejora si aplica",
      "categoryHint": "categoría sugerida"
    }`;
    
    // Usar la API de documentos para analizar el texto
    const [result] = await client.documentTextDetection({
      image: {
        content: Buffer.from(prompt).toString('base64')
      }
    });
    
    // Extraer el texto completo de la respuesta
    const fullText = result.fullTextAnnotation?.text || '';
    
    // Intentar extraer el JSON de la respuesta
    try {
      // Buscar patrón de JSON en el texto
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        return {
          isValid: jsonResponse.isValid,
          suggestion: jsonResponse.suggestion || jsonResponse.reason,
          categoryHint: jsonResponse.categoryHint
        };
      }
      
      // Si no se encuentra un patrón JSON, analizar con heurísticas
      const isValid = !fullText.toLowerCase().includes("no parece") && 
                      !fullText.toLowerCase().includes("incoherente") &&
                      !fullText.toLowerCase().includes("incorrecto");
                      
      return {
        isValid,
        suggestion: "No se pudo obtener un análisis detallado",
        categoryHint: guessCategory(expenseData.description)
      };
    } catch (parseError) {
      console.error("Error al parsear la respuesta de la IA:", parseError);
      // Respuesta por defecto
      return {
        isValid: true,
        suggestion: "No se pudo analizar el gasto con IA, pero se ha registrado",
        categoryHint: guessCategory(expenseData.description)
      };
    }
  } catch (error) {
    console.error("Error al verificar el gasto con IA:", error);
    // En caso de error, permitimos el gasto pero informamos
    return {
      isValid: true,
      suggestion: "No se pudo conectar con el servicio de IA, pero el gasto ha sido registrado",
      categoryHint: guessCategory(expenseData.description)
    };
  }
}

/**
 * Intenta adivinar una categoría en base a palabras clave en la descripción
 */
function guessCategory(description: string): string {
  const normalized = description.toLowerCase();
  
  if (normalized.includes("comida") || normalized.includes("restaurante") || 
      normalized.includes("café") || normalized.includes("menu")) {
    return "Alimentación";
  }
  
  if (normalized.includes("tren") || normalized.includes("taxi") || 
      normalized.includes("uber") || normalized.includes("cabify") ||
      normalized.includes("gasolina") || normalized.includes("transporte")) {
    return "Transporte";
  }
  
  if (normalized.includes("hotel") || normalized.includes("alojamiento") || 
      normalized.includes("apartamento") || normalized.includes("airbnb")) {
    return "Alojamiento";
  }
  
  if (normalized.includes("material") || normalized.includes("oficina") || 
      normalized.includes("papeleria") || normalized.includes("impresora")) {
    return "Material oficina";
  }
  
  if (normalized.includes("telefono") || normalized.includes("movil") || 
      normalized.includes("internet") || normalized.includes("fibra")) {
    return "Telecomunicaciones";
  }
  
  return "Otros gastos";
}

/**
 * Convierte los datos extraídos a un objeto de transacción
 */
export /**
 * Mapea la información extraída de un documento a una transacción
 * Formatea correctamente la información fiscal para que se muestre de forma clara
 */
function mapToTransaction(
  extractedData: ExtractedExpense, 
  userId: number, 
  categoryId: number | null
): InsertTransaction {
  // Obtener valores fiscales
  const subtotal = extractedData.subtotal || 0;
  const taxAmount = extractedData.taxAmount || 0;
  const irpfAmount = extractedData.irpfAmount || 0;
  const ivaRate = extractedData.ivaRate || 21;
  const irpfRate = extractedData.irpfRate || 15;
  
  // Construir detalles fiscales mejorados según los requisitos
  const taxDetails = [];
  
  if (subtotal > 0) {
    taxDetails.push(`💰 Base Imponible: ${subtotal.toFixed(2)}€`);
  }
  
  if (taxAmount > 0) {
    taxDetails.push(`➕ IVA (${ivaRate}%): +${taxAmount.toFixed(2)}€`);
  }
  
  if (irpfAmount > 0) {
    // En facturas de gastos, el IRPF es una retención que REDUCE el importe a pagar
    taxDetails.push(`➖ IRPF (${irpfRate}%): -${irpfAmount.toFixed(2)}€`);
  }
  
  // Añadir el total a pagar como último detalle
  const total = subtotal + taxAmount - irpfAmount;
  taxDetails.push(`💵 Total a pagar: ${total.toFixed(2)}€`);
  
  // Crear impuestos adicionales para almacenar en la base de datos
  let additionalTaxes = [];
  
  // Siempre añadir el IVA como un impuesto adicional
  if (ivaRate > 0) {
    additionalTaxes.push({
      name: 'IVA',
      amount: ivaRate, // Positivo para IVA
      isPercentage: true
    });
  }
  
  // Añadir IRPF si está presente
  if (irpfRate > 0) {
    additionalTaxes.push({
      name: 'IRPF',
      amount: -irpfRate, // Negativo porque es una retención
      isPercentage: true
    });
  }
  
  // Construir notas detalladas con la información fiscal
  const notesText = `📌 Factura de Gasto
📅 Fecha: ${new Date(extractedData.date).toLocaleDateString('es-ES')}
🏢 Proveedor: ${extractedData.vendor || 'No detectado'}

${taxDetails.join('\n')}

Extraído automáticamente mediante reconocimiento de texto.`;
  
  // Si detectamos IRPF, la descripción debería incluir esta información
  let description = extractedData.description;
  if (irpfAmount > 0 && !description.toLowerCase().includes('irpf')) {
    description += ` (con retención IRPF ${irpfRate}%)`;
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
    additionalTaxes: additionalTaxes.length > 0 ? JSON.stringify(additionalTaxes) : null
  };
}