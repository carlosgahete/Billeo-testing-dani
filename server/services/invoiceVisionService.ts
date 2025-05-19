import fs from 'fs';
import path from 'path';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { getVisionClient } from './visionService';

/**
 * Logging condicional para desarrollo
 * Solo muestra logs cuando DEBUG=true en el entorno
 */
function devLog(...args: unknown[]): void {
  if (process.env.DEBUG === 'true') {
    console.log(...args);
  }
}

/**
 * Logging de errores condicional para desarrollo
 * Solo muestra errores cuando DEBUG=true en el entorno
 */
function devError(...args: unknown[]): void {
  if (process.env.DEBUG === 'true') {
    console.error(...args);
  }
}

/**
 * Interfaz para los datos extraídos de facturas
 */
export interface ExtractedInvoice {
  numero_factura: string;
  fecha: string;
  emisor: {
    nombre: string;
    nif: string;
    direccion: string;
  };
  cliente: {
    nombre: string;
    nif: string;
    direccion: string;
  };
  concepto: string;
  base_imponible: number;
  iva: number;
  iva_rate?: number;
  irpf: number;
  irpf_rate?: number;
  total: number;
  metodo_pago: string;
  numero_cuenta?: string;
  errors?: string[];
}

/**
 * Procesa una imagen de factura y extrae los datos siguiendo el formato requerido
 */
export async function processInvoiceImage(imagePath: string): Promise<ExtractedInvoice> {
  try {
    // Inicializa el cliente de Vision API
    const client = getVisionClient();
    
    // Lee el archivo de imagen
    const imageFile = fs.readFileSync(imagePath);
    
    // Envía la imagen a Google Cloud Vision API para OCR
    const [result] = await client.textDetection(imageFile);
    const detections = result.textAnnotations;
    
    // Si no hay detecciones, lanza un error
    if (!detections || detections.length === 0) {
      throw new Error('No se detectó texto en la imagen');
    }
    
    // El primer elemento contiene todo el texto
    const text = detections[0].description;
    
    // Extraer información de la factura del texto
    return extractInvoiceInfo(text);
  } catch (error) {
    devError('Error al procesar la imagen de la factura:', error);
    throw new Error(`Error al procesar la imagen: ${error.message}`);
  }
}

/**
 * Procesa un PDF de factura y extrae los datos
 * Utiliza Vision API para extraer el texto del PDF
 */
export async function processInvoicePDF(pdfPath: string): Promise<ExtractedInvoice> {
  try {
    // Debido a las limitaciones de dependencias, utilizamos Google Vision API para extraer texto del PDF
    // Convertimos la primera página del PDF a imagen utilizando Google Vision API
    const client = getVisionClient();
    
    // Leer el archivo de PDF como buffer
    const pdfFile = fs.readFileSync(pdfPath);
    
    // Enviar la primera página del PDF a Google Cloud Vision API para OCR
    // Vision API puede extraer texto de PDFs directamente
    const [result] = await client.documentTextDetection(pdfFile);
    const fullTextAnnotation = result.fullTextAnnotation;
    
    if (!fullTextAnnotation) {
      throw new Error('No se detectó texto en el PDF');
    }
    
    const text = fullTextAnnotation.text;
    
    // Extraer información de la factura del texto
    return extractInvoiceInfo(text);
  } catch (error) {
    devError('Error al procesar el PDF de la factura:', error);
    throw new Error(`Error al procesar el PDF: ${error.message || "Error desconocido al procesar PDF"}`);
  }
}

/**
 * Extrae la información de factura del texto usando reconocimiento de patrones avanzado
 */
export function extractInvoiceInfo(text: string): ExtractedInvoice {
  const errors: string[] = [];
  
  // Inicializar el objeto de factura con valores por defecto
  const invoice: ExtractedInvoice = {
    numero_factura: '',
    fecha: '',
    emisor: {
      nombre: '',
      nif: '',
      direccion: '',
    },
    cliente: {
      nombre: '',
      nif: '',
      direccion: '',
    },
    concepto: '',
    base_imponible: 0,
    iva: 0,
    irpf: 0,
    total: 0,
    metodo_pago: '',
    errors: [],
  };
  
  // Convertir a minúsculas para facilitar la búsqueda, pero preservar el texto original
  const lowerText = text.toLowerCase();
  
  // Buscar número de factura
  let numeroFacturaMatch: string | null = null;
  
  // Patrón para buscar "Factura Nº: XXX" o "Nº Factura: XXX"
  let match = text.match(/factura\s*n[ºo°]\s*:?\s*([A-Za-z0-9\/-]+)/i);
  if (match) {
    numeroFacturaMatch = match[1].trim();
  } else {
    // Buscar "Nº: XXX" cerca de la palabra factura
    if (lowerText.includes('factura')) {
      match = text.match(/n[ºo°]\s*:?\s*([A-Za-z0-9\/-]+)/i);
      if (match) {
        numeroFacturaMatch = match[1].trim();
      }
    }
    
    // Buscar patrones comunes de números de factura
    if (!numeroFacturaMatch) {
      match = text.match(/F-\d{4}\/\d{4}/);
      if (match) {
        numeroFacturaMatch = match[0];
      } else {
        match = text.match(/\d{4}\/\d{4}/);
        if (match) {
          numeroFacturaMatch = match[0];
        } else {
          match = text.match(/[A-Z]\d{3}/);
          if (match) {
            numeroFacturaMatch = match[0];
          }
        }
      }
    }
  }
  
  if (numeroFacturaMatch) {
    invoice.numero_factura = numeroFacturaMatch;
  } else {
    errors.push('No se pudo identificar el número de factura');
    // Generar un número de factura basado en la fecha actual como fallback
    const now = new Date();
    invoice.numero_factura = `AUTO-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  }
  
  // Buscar fecha de factura
  let fechaMatch: string | null = null;
  
  // Patrón para fechas en formato DD/MM/YYYY o DD-MM-YYYY
  match = text.match(/fecha\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
  if (match) {
    fechaMatch = match[1].trim();
  } else {
    // Buscar patrones de fecha comunes
    match = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
    if (match) {
      fechaMatch = match[1];
    } else {
      match = text.match(/(\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4})/i);
      if (match) {
        fechaMatch = match[1];
        // Convertir fecha en formato texto a DD/MM/YYYY
        const meses: {[key: string]: string} = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };
        
        const fechaPartes = fechaMatch.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i);
        if (fechaPartes) {
          const dia = fechaPartes[1].padStart(2, '0');
          const mes = meses[fechaPartes[2].toLowerCase()];
          const anio = fechaPartes[3];
          if (mes) {
            fechaMatch = `${dia}/${mes}/${anio}`;
          }
        }
      }
    }
  }
  
  if (fechaMatch) {
    // Normalizar formato de fecha a DD/MM/YYYY
    const cleanFecha = fechaMatch.replace(/-/g, '/');
    
    // Verificar si es un formato válido
    const fechaRegex = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
    if (fechaRegex.test(cleanFecha)) {
      let [dia, mes, anio] = cleanFecha.split('/');
      
      // Asegurarse de que el año tenga 4 dígitos
      if (anio.length === 2) {
        const currentYear = new Date().getFullYear().toString();
        const century = currentYear.slice(0, 2);
        anio = century + anio;
      }
      
      // Formatear con ceros a la izquierda
      dia = dia.padStart(2, '0');
      mes = mes.padStart(2, '0');
      
      invoice.fecha = `${dia}/${mes}/${anio}`;
    } else {
      invoice.fecha = cleanFecha;
    }
  } else {
    errors.push('No se pudo identificar la fecha de la factura');
    // Usar la fecha actual como fallback
    const now = new Date();
    invoice.fecha = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  }
  
  // Extraer datos del emisor
  // Buscar NIF/CIF del emisor
  match = text.match(/NIF|CIF|N\.I\.F\.|C\.I\.F\.|Número de Identificación Fiscal\s*:?\s*([A-Z0-9]{9})/i);
  if (match) {
    invoice.emisor.nif = match[1].trim();
  } else {
    // Buscar patrón de NIF/CIF (letra seguida de 8 dígitos o 8 dígitos seguidos de letra)
    const nifMatches = text.match(/\b([A-Z]\d{8}|\d{8}[A-Z])\b/g);
    if (nifMatches && nifMatches.length > 0) {
      // Tomar el primer NIF encontrado como el del emisor
      invoice.emisor.nif = nifMatches[0];
    }
  }
  
  // Buscar nombre del emisor
  if (lowerText.includes('emisor') || lowerText.includes('proveedor')) {
    const lineaEmisor = findLineContaining(text, ['emisor:', 'proveedor:']);
    if (lineaEmisor) {
      const nombreMatch = lineaEmisor.match(/(?:emisor|proveedor)\s*:?\s*(.*)/i);
      if (nombreMatch) {
        invoice.emisor.nombre = nombreMatch[1].trim();
      }
    }
  }
  
  // Si no se encontró el nombre explícitamente, usar las primeras líneas que no sean fecha ni número
  if (!invoice.emisor.nombre) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    for (const line of lines.slice(0, 5)) {
      if (!line.match(/fecha|factura|n[º°]/i) && !line.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
        invoice.emisor.nombre = line;
        break;
      }
    }
  }
  
  // Buscar dirección del emisor
  if (lowerText.includes('dirección') && !lowerText.includes('dirección de entrega')) {
    const lineaDireccion = findLineContaining(text, ['dirección:']);
    if (lineaDireccion) {
      const direccionMatch = lineaDireccion.match(/dirección\s*:?\s*(.*)/i);
      if (direccionMatch) {
        invoice.emisor.direccion = direccionMatch[1].trim();
      }
    }
  } else if (lowerText.includes('domicilio')) {
    const lineaDomicilio = findLineContaining(text, ['domicilio:']);
    if (lineaDomicilio) {
      const domicilioMatch = lineaDomicilio.match(/domicilio\s*:?\s*(.*)/i);
      if (domicilioMatch) {
        invoice.emisor.direccion = domicilioMatch[1].trim();
      }
    }
  } else {
    // Buscar patrones comunes de direcciones (calles, avenidas, etc.)
    const direccionPatterns = [
      /\b(C\/|Calle|Avda\.|Avenida|Plaza|Paseo|Ronda)\s+[^\n,]+(?:,\s*\d+)?/i,
      /\b\d{5}\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/  // Código postal seguido de ciudad
    ];
    
    for (const pattern of direccionPatterns) {
      match = text.match(pattern);
      if (match) {
        invoice.emisor.direccion = match[0].trim();
        break;
      }
    }
  }
  
  // Extraer datos del cliente
  // Buscar sección "CLIENTE" o "DATOS CLIENTE"
  let clienteSection = '';
  
  if (lowerText.includes('cliente') || lowerText.includes('facturar a')) {
    const clienteIndex = Math.max(
      lowerText.indexOf('cliente'),
      lowerText.indexOf('facturar a')
    );
    
    if (clienteIndex >= 0) {
      // Tomar varias líneas después de la palabra "cliente"
      clienteSection = text.substring(clienteIndex, clienteIndex + 300);
    }
  }
  
  // Extraer NIF/CIF del cliente
  if (clienteSection) {
    // Primero buscar en la sección del cliente
    match = clienteSection.match(/NIF|CIF|N\.I\.F\.|C\.I\.F\.|Número de Identificación Fiscal\s*:?\s*([A-Z0-9]{9})/i);
    if (match) {
      invoice.cliente.nif = match[1].trim();
    } else {
      // Buscar patrón de NIF/CIF en la sección del cliente
      const nifMatches = clienteSection.match(/\b([A-Z]\d{8}|\d{8}[A-Z])\b/g);
      if (nifMatches && nifMatches.length > 0) {
        invoice.cliente.nif = nifMatches[0];
      }
    }
  }
  
  // Si no se encontró en la sección del cliente, buscar un segundo NIF en todo el texto
  if (!invoice.cliente.nif) {
    const allNifMatches = text.match(/\b([A-Z]\d{8}|\d{8}[A-Z])\b/g);
    if (allNifMatches && allNifMatches.length > 1) {
      // Tomar el segundo NIF encontrado como el del cliente
      // (asumiendo que el primero es del emisor)
      invoice.cliente.nif = allNifMatches[1];
    }
  }
  
  // Extraer nombre del cliente
  if (clienteSection) {
    // Buscar después de "Cliente:" o "Facturar a:"
    match = clienteSection.match(/(?:cliente|facturar a)\s*:?\s*(.*?)(?:\n|NIF|CIF|Dirección)/is);
    if (match) {
      invoice.cliente.nombre = match[1].trim();
    } else {
      // Tomar la primera línea no vacía después de "Cliente" o "Facturar a"
      const lines = clienteSection.split('\n');
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        if (lines[i].match(/cliente|facturar a/i) && i + 1 < lines.length) {
          invoice.cliente.nombre = lines[i + 1].trim();
          break;
        }
      }
    }
  }
  
  // Si todavía no hay nombre de cliente, buscarlo cerca de su NIF
  if (!invoice.cliente.nombre && invoice.cliente.nif) {
    const nifIndex = text.indexOf(invoice.cliente.nif);
    if (nifIndex > 0) {
      // Buscar en las líneas anteriores al NIF
      const previousText = text.substring(Math.max(0, nifIndex - 100), nifIndex);
      const lines = previousText.split('\n').reverse(); // Revertir para empezar desde la más cercana
      
      for (const line of lines) {
        if (line.trim() && !line.match(/NIF|CIF|N\.I\.F\.|C\.I\.F\.|FACTURA|FECHA|Nº/i)) {
          invoice.cliente.nombre = line.trim();
          break;
        }
      }
    }
  }
  
  // Extraer dirección del cliente
  if (clienteSection) {
    // Buscar después de "Dirección:" en la sección del cliente
    match = clienteSection.match(/dirección\s*:?\s*(.*?)(?:\n|NIF|CIF)/is);
    if (match) {
      invoice.cliente.direccion = match[1].trim();
    } else {
      // Buscar patrones de dirección en la sección del cliente
      for (const line of clienteSection.split('\n')) {
        if (line.match(/\b(C\/|Calle|Avda\.|Avenida|Plaza|Paseo)\s+/i) || line.match(/\b\d{5}\s+[A-ZÁÉÍÓÚÑ]/)) {
          invoice.cliente.direccion = line.trim();
          break;
        }
      }
    }
  }
  
  // Si no se encontró una dirección específica, tratar de inferirla
  if (!invoice.cliente.direccion && invoice.cliente.nombre) {
    const clienteIndex = text.indexOf(invoice.cliente.nombre);
    if (clienteIndex >= 0) {
      const afterClientName = text.substring(clienteIndex + invoice.cliente.nombre.length, clienteIndex + 300);
      const lines = afterClientName.split('\n');
      
      for (const line of lines.slice(0, 3)) { // Revisar las primeras líneas después del nombre
        if (line.match(/\b(C\/|Calle|Avda\.|Avenida|Plaza|Paseo)\b/i) || line.match(/\b\d{5}\b/)) {
          invoice.cliente.direccion = line.trim();
          break;
        }
      }
    }
  }
  
  // Si no se ha encontrado cliente, añadir un error
  if (!invoice.cliente.nombre && !invoice.cliente.nif) {
    errors.push('No se han podido identificar los datos del cliente');
  }
  
  // Extraer concepto/descripción
  // Buscar sección con conceptos o descripciones
  if (lowerText.includes('concepto') || lowerText.includes('descripción')) {
    const conceptoMatch = text.match(/(?:concepto|descripción)\s*:?\s*(.*?)(?:\n\s*(?:importe|base|total)|\n\n)/is);
    if (conceptoMatch) {
      invoice.concepto = conceptoMatch[1].trim();
    } else {
      // Buscar línea que contenga "concepto" o "descripción"
      const lineaConcepto = findLineContaining(text, ['concepto:', 'descripción:']);
      if (lineaConcepto) {
        const match = lineaConcepto.match(/(?:concepto|descripción)\s*:?\s*(.*)/i);
        if (match) {
          invoice.concepto = match[1].trim();
        }
      }
    }
  }
  
  // Si no se encontró explícitamente, buscar en secciones de detalles o líneas de factura
  if (!invoice.concepto) {
    if (lowerText.includes('detalle') || lowerText.includes('líneas')) {
      const detalleIndex = Math.max(
        lowerText.indexOf('detalle'),
        lowerText.indexOf('líneas')
      );
      
      if (detalleIndex >= 0) {
        const detalleSection = text.substring(detalleIndex, detalleIndex + 200);
        const lines = detalleSection.split('\n').slice(1, 3); // Tomar un par de líneas después del encabezado
        
        if (lines.length > 0) {
          invoice.concepto = lines.join(' ').trim();
        }
      }
    }
  }
  
  // Si todavía no hay concepto, usar una cadena genérica
  if (!invoice.concepto) {
    invoice.concepto = "Servicios profesionales";
    errors.push('No se pudo identificar el concepto o descripción de la factura');
  }
  
  // Extraer importes
  // Buscar base imponible
  match = text.match(/base\s*(?:imponible)?\s*:?\s*(\d+[.,]\d+|\d+)/i);
  if (match) {
    invoice.base_imponible = parseFloat(match[1].replace(',', '.'));
  } else {
    // Buscar subtotal si no hay base imponible
    match = text.match(/subtotal\s*:?\s*(\d+[.,]\d+|\d+)/i);
    if (match) {
      invoice.base_imponible = parseFloat(match[1].replace(',', '.'));
    } else {
      errors.push('No se pudo identificar la base imponible o subtotal');
    }
  }
  
  // Buscar importe de IVA y tasa
  match = text.match(/iva\s*(?:\(\s*(\d+)\s*%\s*\))?\s*:?\s*(\d+[.,]\d+|\d+)/i);
  if (match) {
    // Captura el porcentaje de IVA si está presente
    if (match[1]) {
      invoice.iva_rate = parseInt(match[1], 10);
    }
    // Captura el importe de IVA
    invoice.iva = parseFloat(match[2].replace(',', '.'));
  } else {
    // Buscar expresiones alternativas para el IVA
    match = text.match(/i\.v\.a\.\s*(?:\(\s*(\d+)\s*%\s*\))?\s*:?\s*(\d+[.,]\d+|\d+)/i);
    if (match) {
      if (match[1]) {
        invoice.iva_rate = parseInt(match[1], 10);
      }
      invoice.iva = parseFloat(match[2].replace(',', '.'));
    } else {
      errors.push('No se pudo identificar el importe del IVA');
    }
  }
  
  // Si tenemos base imponible pero no importe de IVA ni tasa, intentar inferir
  if (invoice.base_imponible > 0 && !invoice.iva && !invoice.iva_rate) {
    // Buscar un porcentaje cercano a la palabra "IVA"
    const ivaIndex = lowerText.indexOf('iva');
    if (ivaIndex >= 0) {
      const nearIvaText = text.substring(Math.max(0, ivaIndex - 10), ivaIndex + 30);
      const percentMatch = nearIvaText.match(/(\d+)\s*%/);
      if (percentMatch) {
        invoice.iva_rate = parseInt(percentMatch[1], 10);
        // Calcular el importe de IVA basado en la tasa
        invoice.iva = parseFloat((invoice.base_imponible * (invoice.iva_rate / 100)).toFixed(2));
      }
    }
    
    // Si aún no tenemos tasa de IVA, usar 21% por defecto
    if (!invoice.iva_rate) {
      invoice.iva_rate = 21;
      invoice.iva = parseFloat((invoice.base_imponible * 0.21).toFixed(2));
      errors.push('No se pudo identificar la tasa de IVA, se asume 21% por defecto');
    }
  }
  
  // Buscar importe de IRPF y tasa
  match = text.match(/irpf\s*(?:\(\s*(-?\d+)\s*%\s*\))?\s*:?\s*(-?\d+[.,]\d+|-?\d+)/i);
  if (match) {
    // Captura el porcentaje de IRPF si está presente (puede ser negativo)
    if (match[1]) {
      invoice.irpf_rate = parseInt(match[1], 10);
    }
    // Captura el importe de IRPF (puede ser negativo)
    const irpfValue = match[2].replace(',', '.');
    invoice.irpf = parseFloat(irpfValue);
    
    // Asegurarse de que el IRPF sea positivo para cálculos internos
    if (invoice.irpf < 0) {
      invoice.irpf = Math.abs(invoice.irpf);
    }
  } else {
    // Buscar términos alternativos para IRPF (retención)
    match = text.match(/retención\s*(?:\(\s*(-?\d+)\s*%\s*\))?\s*:?\s*(-?\d+[.,]\d+|-?\d+)/i);
    if (match) {
      if (match[1]) {
        invoice.irpf_rate = parseInt(match[1], 10);
        
        // Si la tasa es positiva pero claramente es una retención, hacerla negativa
        if (invoice.irpf_rate > 0 && match[0].toLowerCase().includes('retención')) {
          invoice.irpf_rate = -invoice.irpf_rate;
        }
      }
      
      const retencionValue = match[2].replace(',', '.');
      invoice.irpf = parseFloat(retencionValue);
      
      // Asegurarse de que la retención sea positiva para cálculos internos
      if (invoice.irpf < 0) {
        invoice.irpf = Math.abs(invoice.irpf);
      }
    } else {
      // Si no hay IRPF explícito, dejarlo en 0
      invoice.irpf = 0;
    }
  }
  
  // Inferir la tasa de IRPF si tenemos el importe pero no la tasa
  if (invoice.irpf > 0 && !invoice.irpf_rate && invoice.base_imponible > 0) {
    // Calcular la tasa basada en la base imponible
    const calculatedRate = Math.round((invoice.irpf / invoice.base_imponible) * 100);
    
    // Verificar si la tasa calculada está cerca de tasas comunes de IRPF (7%, 15%, 19%)
    const commonRates = [7, 15, 19];
    let closestRate = commonRates.reduce((prev, curr) => {
      return (Math.abs(curr - calculatedRate) < Math.abs(prev - calculatedRate)) ? curr : prev;
    });
    
    // Si está cerca de una tasa común, usar esa tasa
    if (Math.abs(closestRate - calculatedRate) <= 2) {
      invoice.irpf_rate = closestRate;
    } else {
      // Si no está cerca de una tasa común, usar la calculada
      invoice.irpf_rate = calculatedRate;
    }
  }
  
  // Buscar importe total
  match = text.match(/total\s*(?:factura)?\s*:?\s*(\d+[.,]\d+|\d+)/i);
  if (match) {
    invoice.total = parseFloat(match[1].replace(',', '.'));
  } else {
    // Calcular el total si no se encuentra explícitamente
    if (invoice.base_imponible > 0) {
      invoice.total = invoice.base_imponible + invoice.iva - invoice.irpf;
      errors.push('No se pudo identificar el importe total, se ha calculado en base a los demás importes');
    } else {
      errors.push('No se pudo identificar ni calcular el importe total');
    }
  }
  
  // Verificar la coherencia de los importes
  const calculatedTotal = parseFloat((invoice.base_imponible + invoice.iva - invoice.irpf).toFixed(2));
  if (Math.abs(invoice.total - calculatedTotal) > 0.1) {
    errors.push(`Posible inconsistencia en los importes: Total (${invoice.total}) no coincide con Base + IVA - IRPF (${calculatedTotal})`);
  }
  
  // Extraer método de pago
  if (lowerText.includes('forma de pago') || lowerText.includes('método de pago') || lowerText.includes('pago')) {
    match = text.match(/(?:forma|método|condiciones)\s+de\s+pago\s*:?\s*(.*?)(?:\n|$)/i);
    if (match) {
      invoice.metodo_pago = match[1].trim();
    } else {
      // Buscar patrones comunes de métodos de pago
      const metodoPagoPatterns = [
        /transferencia\s+bancaria/i,
        /efectivo/i,
        /tarjeta(?:\s+de\s+crédito)?/i,
        /domiciliación\s+bancaria/i,
        /paypal/i,
        /bizum/i
      ];
      
      for (const pattern of metodoPagoPatterns) {
        if (lowerText.match(pattern)) {
          invoice.metodo_pago = lowerText.match(pattern)![0];
          break;
        }
      }
    }
  }
  
  // Si no se encontró método de pago específico
  if (!invoice.metodo_pago) {
    invoice.metodo_pago = "No especificado";
  }
  
  // Extraer número de cuenta (si existe)
  const ibanPattern = /\b[A-Z]{2}\d{2}[\s]?(\d{4}[\s]?){5}|(\d{4}[\s]?){5}\b/;
  match = text.match(ibanPattern);
  if (match) {
    invoice.numero_cuenta = match[0].replace(/\s+/g, '');
    
    // Formatear el IBAN con espacios cada 4 caracteres
    let formattedIban = '';
    for (let i = 0; i < invoice.numero_cuenta.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedIban += ' ';
      }
      formattedIban += invoice.numero_cuenta[i];
    }
    invoice.numero_cuenta = formattedIban.trim();
  }
  
  // Guardar los errores y advertencias
  if (errors.length > 0) {
    invoice.errors = errors;
  }
  
  return invoice;
}

/**
 * Valida si el número de factura sigue la secuencia correcta
 * @param numeroFactura El número de factura detectado
 * @param ultimoNumero El último número de factura registrado
 */
export function validarSecuenciaFactura(numeroFactura: string, ultimoNumero: string): boolean {
  // Normalizar los números de factura (eliminar espacios, guiones, etc.)
  const normalizado1 = numeroFactura.replace(/\s+/g, '');
  const normalizado2 = ultimoNumero.replace(/\s+/g, '');
  
  // Si los formatos son diferentes, no podemos validar la secuencia
  if (normalizado1.match(/^\d+$/) && normalizado2.match(/^\d+$/)) {
    // Si ambos son números, comparar directamente
    const num1 = parseInt(normalizado1, 10);
    const num2 = parseInt(normalizado2, 10);
    
    // Permitir que la secuencia sea correcta si el nuevo número es el último + 1
    return num1 === num2 + 1;
  } else if (normalizado1.match(/^[A-Za-z]-\d+$/) && normalizado2.match(/^[A-Za-z]-\d+$/)) {
    // Si tienen formato "X-999"
    const [prefijo1, numero1] = normalizado1.split('-');
    const [prefijo2, numero2] = normalizado2.split('-');
    
    if (prefijo1.toUpperCase() === prefijo2.toUpperCase()) {
      return parseInt(numero1, 10) === parseInt(numero2, 10) + 1;
    }
  } else if (normalizado1.match(/^[A-Za-z]\d+$/) && normalizado2.match(/^[A-Za-z]\d+$/)) {
    // Si tienen formato "X999"
    const prefijo1 = normalizado1.charAt(0);
    const prefijo2 = normalizado2.charAt(0);
    const numero1 = normalizado1.substring(1);
    const numero2 = normalizado2.substring(1);
    
    if (prefijo1.toUpperCase() === prefijo2.toUpperCase()) {
      return parseInt(numero1, 10) === parseInt(numero2, 10) + 1;
    }
  } else if (normalizado1.match(/^\d{4}\/\d+$/) && normalizado2.match(/^\d{4}\/\d+$/)) {
    // Si tienen formato "2023/001"
    const [anio1, numero1] = normalizado1.split('/');
    const [anio2, numero2] = normalizado2.split('/');
    
    if (anio1 === anio2) {
      return parseInt(numero1, 10) === parseInt(numero2, 10) + 1;
    } else if (parseInt(anio1, 10) === parseInt(anio2, 10) + 1) {
      // Si cambia el año, el número debería reiniciarse
      return parseInt(numero1, 10) === 1;
    }
  }
  
  // Si no podemos determinar la secuencia correcta, asumimos que es válida
  return true;
}

// Función auxiliar para encontrar líneas que contengan ciertas palabras clave
function findLineContaining(text: string, keywords: string[]): string | null {
  const lines = text.split('\n');
  for (const line of lines) {
    for (const keyword of keywords) {
      if (line.toLowerCase().includes(keyword.toLowerCase())) {
        return line;
      }
    }
  }
  return null;
}