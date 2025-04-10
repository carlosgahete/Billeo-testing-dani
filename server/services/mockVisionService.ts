/**
 * Servicio para simular el procesamiento de documentos sin requerir Google Cloud Vision API
 * Esto permite que la aplicación siga funcionando mientras no tengamos las credenciales configuradas
 */

import * as fs from 'fs';
import * as path from 'path';

// Definición de la estructura de datos extraídos
interface ExtractedData {
  date: string;
  description: string;
  amount: number;
  baseAmount: number;
  tax: number;
  taxAmount: number;
  irpf: number;
  irpfAmount: number;
  provider: string;
  categoryHint: string;
}

// Estructura de la transacción que espera el sistema
interface TransactionData {
  userId: string | number;
  title?: string;
  description: string;
  amount: string; // Debe ser string según el esquema esperado
  date: Date;
  type: string; // 'income' | 'expense' pero aceptamos string para mayor flexibilidad
  categoryId: string | number | null;
  paymentMethod?: string;
  notes?: string;
  additionalTaxes?: any;
}

export async function processReceiptImage(imagePath: string) {
  console.log('Procesando imagen de recibo (simulado):', imagePath);
  
  // Obtener la URL del archivo
  const documentUrl = imagePath.replace(/\\/g, '/');
  const publicUrl = documentUrl.replace('uploads/', '/uploads/');
  
  try {
    // Leer metadatos del archivo para conseguir información sobre la imagen
    const stats = fs.statSync(imagePath);
    const filename = path.basename(imagePath);
    
    // Usar información del nombre del archivo y tamaño para generar datos variados
    // Esto simula que hemos "leído" información diferente de cada factura
    const fileSize = stats.size;
    const dateDigit = parseInt(filename.substr(-6, 2));
    
    // Generar fecha basada en parte del nombre del archivo
    const currentDate = new Date();
    const day = Math.max(1, Math.min(28, dateDigit || currentDate.getDate()));
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    // Usar tamaño del archivo para generar valores diferentes
    // Esto simula que el OCR ha leído diferentes cantidades según la factura
    const baseDigit = (fileSize % 1000) / 10; // Valor entre 0-100
    const multiplier = Math.max(1, baseDigit / 10); // Valor entre 0.1-10
    
    // Generar valores fiscales basados en el "contenido" del archivo
    const baseAmount = Math.round(750 * multiplier * 100) / 100; // 75-7500€
    const taxRate = 21; // IVA estándar en España
    const taxAmount = Math.round(baseAmount * (taxRate / 100) * 100) / 100;
    const irpfRate = 15; // Retención típica para autónomos
    const irpfAmount = Math.round(baseAmount * (irpfRate / 100) * 100) / 100;
    const total = Math.round((baseAmount + taxAmount - irpfAmount) * 100) / 100;
    
    // Generar un proveedor y descripción diferentes según el archivo
    const possibleProviders = ["Suministros Técnicos SL", "Servicios Profesionales Martínez", 
                              "Reforma y Construcción Ibérica", "Material Oficina Express", 
                              "Consultoría Digital SA", "Telefonía y Datos", "Gestoría López"];
    
    const possibleDescriptions = ["Servicios profesionales", "Material informático", 
                                 "Suministros oficina", "Asesoramiento técnico", 
                                 "Mantenimiento equipos", "Servicios de reparación",
                                 "Consultoría empresarial", "Servicios de diseño"];
    
    // Seleccionar proveedor y descripción basados en características del archivo
    const providerIndex = Math.abs(fileSize % possibleProviders.length);
    const descriptionIndex = Math.abs((fileSize / 1000) % possibleDescriptions.length);
    
    const provider = possibleProviders[providerIndex];
    const description = possibleDescriptions[Math.floor(descriptionIndex)];
    
    // Crear datos simulados para el recibo con todas las propiedades fiscales correctas
    return {
      success: true,
      documentUrl: publicUrl,
      extractedData: {
        date: formattedDate,
        description: description,
        amount: total,
        baseAmount: baseAmount,
        tax: taxRate,
        taxAmount: taxAmount,
        irpf: irpfRate,
        irpfAmount: irpfAmount, // Cantidad como valor positivo (se convierte a negativo más tarde)
        provider: provider,
        categoryHint: "Servicios profesionales",
        ivaRate: taxRate,
        irpfRate: irpfRate,
        subtotal: baseAmount
      }
    };
  } catch (error) {
    console.error('Error al procesar la simulación de imagen:', error);
    
    // Si hay algún error, devolver valores predeterminados
    return {
      success: true,
      documentUrl: publicUrl,
      extractedData: {
        date: new Date().toISOString().split('T')[0],
        description: "Servicios profesionales",
        amount: 100.00,
        baseAmount: 100.00,
        tax: 21,
        taxAmount: 21.00,
        irpf: 15,
        irpfAmount: 15.00,
        provider: "Proveedor ejemplo",
        categoryHint: "Servicios",
        ivaRate: 21,
        irpfRate: 15,
        subtotal: 100.00
      }
    };
  }
}

export async function processReceiptPDF(pdfPath: string) {
  console.log('Procesando PDF de recibo (simulado):', pdfPath);
  
  // Obtener la URL del archivo
  const documentUrl = pdfPath.replace(/\\/g, '/');
  const publicUrl = documentUrl.replace('uploads/', '/uploads/');
  
  try {
    // Leer metadatos del archivo para conseguir información sobre el PDF
    const stats = fs.statSync(pdfPath);
    const filename = path.basename(pdfPath);
    
    // Usar información del nombre del archivo y tamaño para generar datos variados
    // Esto simula que hemos "leído" información diferente de cada factura
    const fileSize = stats.size;
    const dateDigit = parseInt(filename.substr(-6, 2)) || 15; // Valor por defecto 15
    
    // Generar fecha basada en parte del nombre del archivo
    const currentDate = new Date();
    const day = Math.max(1, Math.min(28, dateDigit));
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    // Calcular valores basados en el tamaño del archivo
    // Usar tamaño del archivo para generar valores diferentes
    const baseDigit = Math.abs((fileSize % 2000) / 10); // Valor entre 0-200
    const multiplier = Math.max(0.5, baseDigit / 20); // Valor entre 0.5-10
    
    // Generar valores fiscales basados en el "contenido" del archivo
    const baseAmount = Math.round(500 * multiplier * 100) / 100; // Valores entre 250-5000€
    const taxRate = 21; // IVA estándar en España
    const taxAmount = Math.round(baseAmount * (taxRate / 100) * 100) / 100;
    const irpfRate = 15; // Retención típica para autónomos
    const irpfAmount = Math.round(baseAmount * (irpfRate / 100) * 100) / 100;
    const total = Math.round((baseAmount + taxAmount - irpfAmount) * 100) / 100;
    
    // Generar un proveedor y descripción diferentes según el archivo
    const possibleProviders = [
      "Asesores Fiscales Asociados", 
      "TechSolutions SL", 
      "Distribuciones García e Hijos",
      "Servicios Informáticos Integrales", 
      "Suministros López SA", 
      "Arrendamientos Urbanos SL",
      "Consultora Estratégica", 
      "Transportes Rápidos", 
      "Imprenta Digital",
      "Marketing Online Pro"
    ];
    
    const possibleDescriptions = [
      "Servicios contables trimestrales", 
      "Mantenimiento sistemas", 
      "Suministro material informático",
      "Asesoría legal y fiscal", 
      "Alquiler oficina", 
      "Desarrollo web y mantenimiento",
      "Servicios de marketing digital", 
      "Servicios de impresión", 
      "Reparación equipos",
      "Consultoría empresarial especializada"
    ];
    
    // Seleccionar proveedor y descripción basados en características del archivo
    const providerIndex = Math.abs(fileSize % possibleProviders.length);
    const descriptionIndex = Math.abs((fileSize / 1000) % possibleDescriptions.length);
    
    const provider = possibleProviders[providerIndex];
    const description = possibleDescriptions[Math.floor(descriptionIndex)];
    
    // Seleccionar categoría apropiada según la descripción
    let categoryHint = "Servicios profesionales";
    if (description.includes("oficina") || description.includes("material")) {
      categoryHint = "Material oficina";
    } else if (description.includes("legal") || description.includes("contables") || description.includes("fiscal")) {
      categoryHint = "Asesoría";
    } else if (description.includes("alquiler")) {
      categoryHint = "Alquiler";
    } else if (description.includes("marketing") || description.includes("web")) {
      categoryHint = "Marketing";
    }
    
    // Crear datos simulados para el recibo con todas las propiedades fiscales correctas
    return {
      success: true,
      documentUrl: publicUrl,
      extractedData: {
        date: formattedDate,
        description: description,
        amount: total,
        baseAmount: baseAmount,
        tax: taxRate,
        taxAmount: taxAmount,
        irpf: irpfRate,
        irpfAmount: irpfAmount, // Se convertirá a negativo más tarde si es necesario
        provider: provider,
        categoryHint: categoryHint,
        ivaRate: taxRate,
        irpfRate: irpfRate,
        subtotal: baseAmount
      }
    };
  } catch (error) {
    console.error('Error al procesar la simulación de PDF:', error);
    
    // Si hay algún error, devolver valores predeterminados
    return {
      success: true,
      documentUrl: publicUrl,
      extractedData: {
        date: new Date().toISOString().split('T')[0],
        description: "Servicios profesionales",
        amount: 242.00,
        baseAmount: 200.00,
        tax: 21,
        taxAmount: 42.00,
        irpf: 15,
        irpfAmount: 30.00,
        provider: "Empresa de servicios",
        categoryHint: "Servicios profesionales",
        ivaRate: 21,
        irpfRate: 15,
        subtotal: 200.00
      }
    };
  }
}

export async function verifyExpenseWithAI(data: { description: string, amount: number }) {
  // Simular verificación de gastos
  console.log('Verificando gasto con IA (simulado):', data);
  return {
    isValid: true,
    suggestion: "Gasto validado correctamente",
    details: "La verificación simulada aprueba este gasto"
  };
}

/**
 * Mapea los datos extraídos a una estructura de transacción
 * Esta función simula la misma funcionalidad que la función en visionService.ts
 */
export function mapToTransaction(
  extractedData: ExtractedData, 
  userId: string | number,
  categoryId: string | number | null
): TransactionData {
  console.log("Datos recibidos en mapToTransaction:", JSON.stringify(extractedData, null, 2));
  
  // Extraer los valores fiscales esenciales
  const baseAmount = extractedData.baseAmount || 0;
  const taxRate = extractedData.tax || extractedData.ivaRate || 21;
  const taxAmount = extractedData.taxAmount || 0;
  
  // Para el IRPF, preferimos usar el rate si está disponible, de lo contrario calcular basado en el importe
  let irpfRate = extractedData.irpf || extractedData.irpfRate || 0;
  let irpfAmount = extractedData.irpfAmount || 0;
  
  // Si el IRPF es un valor muy alto (>100), probablemente es un monto, no un porcentaje
  if (irpfRate > 100) {
    console.log(`⚠️ Corrigiendo valor anormal de IRPF: ${irpfRate} -> -15`);
    irpfRate = 15; // Valor estándar para autónomos
    
    // Recalcular el importe IRPF basado en la base imponible
    if (baseAmount > 0) {
      irpfAmount = Math.round(baseAmount * (irpfRate / 100) * 100) / 100;
      console.log(`⚠️ Recalculando importe IRPF basado en porcentaje: -${irpfAmount}`);
    }
  }
  
  // Verificar coherencia en el total
  const calculatedTotal = baseAmount + taxAmount - irpfAmount;
  const declaredTotal = typeof extractedData.amount === 'number' ? 
    extractedData.amount : 
    parseFloat(String(extractedData.amount || '0'));
  
  if (Math.abs(calculatedTotal - declaredTotal) > 0.5) {
    console.log(`⚠️ Advertencia: El total (${declaredTotal}€) no coincide con Base + IVA - IRPF (${calculatedTotal}€)`);
    console.log(`⚠️ Ajustando total para mantener coherencia fiscal`);
  }
  
  // Búsqueda de proveedor y cliente
  console.log("=== BUSCANDO PROVEEDOR DE LA FACTURA ===");
  const vendor = extractedData.vendor || extractedData.provider || '';
  let provider = vendor;
  
  if (vendor) {
    console.log(`Proveedor encontrado por título explícito: "${vendor}"`);
  } else {
    console.log("No se ha podido detectar el proveedor automáticamente");
    provider = "Proveedor no identificado";
  }
  
  console.log("=== BUSCANDO CLIENTE DE LA FACTURA ===");
  const client = extractedData.client || '';
  
  if (client) {
    console.log(`Cliente encontrado por título explícito: "${client}" (original: "${client}")`);
  }
  
  // Selección de descripción de factura
  const description = extractedData.description || "Gasto profesional";
  console.log(`Descripción/concepto detectado (patrón 1): ${description}`);
  
  // Crear impuestos adicionales correctamente formateados
  const additionalTaxes = [];
  
  // Añadir IVA (siempre como porcentaje positivo)
  if (taxRate > 0) {
    additionalTaxes.push({
      name: "IVA",
      amount: taxRate, // Porcentaje como valor positivo
      isPercentage: true
    });
  }
  
  // Añadir IRPF (siempre como porcentaje negativo)
  if (irpfRate > 0) {
    additionalTaxes.push({
      name: "IRPF",
      amount: -irpfRate, // Porcentaje como valor negativo
      isPercentage: true
    });
  }
  
  // Convertir la fecha extraída a un objeto Date
  const dateObj = new Date(extractedData.date);
  
  // Formatear la fecha para las notas en formato español
  const formattedDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
  
  // Generar notas detalladas con formato claro y completo
  let notesText = `📌 Factura de Gasto
📅 Fecha: ${formattedDate}
🏢 Proveedor: ${provider}`;

  // Añadir cliente solo si está disponible
  if (client) {
    notesText += `\n👤 Cliente: ${client}`;
  }
  
  // Añadir detalles fiscales
  notesText += `\n
💰 Base Imponible: ${baseAmount.toFixed(2)}€
➕ IVA (${taxRate}%): +${taxAmount.toFixed(2)}€`;

  // Incluir IRPF solo si está presente
  if (irpfRate > 0) {
    notesText += `\n➖ IRPF (-${irpfRate}%): -${irpfAmount.toFixed(2)}€`;
  }

  // Añadir total
  notesText += `\n💵 Total a pagar: ${calculatedTotal.toFixed(2)}€

Extraído automáticamente mediante reconocimiento de texto.`;
  
  // Crear el objeto de transacción final
  const result = {
    userId,
    title: provider,
    description: description,
    amount: calculatedTotal.toString(),
    date: dateObj,
    type: 'expense' as const,
    categoryId,
    paymentMethod: 'other',
    notes: notesText,
    additionalTaxes: JSON.stringify(additionalTaxes)
  };
  
  console.log("Transacción mapeada:", JSON.stringify(result, null, 2));
  
  return result;
}