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
  type: 'income' | 'expense';
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
  
  // Calcular valores fiscales correctos para ejemplo
  const baseAmount = 103.64;
  const taxRate = 21;
  const taxAmount = baseAmount * (taxRate / 100);
  const irpfRate = 15; // Retención típica para autónomos
  const irpfAmount = -(baseAmount * (irpfRate / 100)); // Valor NEGATIVO para IRPF
  const total = baseAmount + taxAmount + irpfAmount;
  
  // Crear datos simulados para el recibo con IRPF correcto
  return {
    success: true,
    documentUrl: publicUrl,
    extractedData: {
      date: new Date().toISOString().split('T')[0],
      description: "Gastos profesionales",
      amount: parseFloat(total.toFixed(2)), // Redondeamos a 2 decimales
      baseAmount: baseAmount,
      tax: taxRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      irpf: irpfRate, // Porcentaje como valor positivo
      irpfAmount: parseFloat(irpfAmount.toFixed(2)), // Cantidad como valor negativo
      provider: "Proveedor de servicios",
      categoryHint: "Servicios profesionales"
    }
  };
}

export async function processReceiptPDF(pdfPath: string) {
  console.log('Procesando PDF de recibo (simulado):', pdfPath);
  
  // Obtener la URL del archivo
  const documentUrl = pdfPath.replace(/\\/g, '/');
  const publicUrl = documentUrl.replace('uploads/', '/uploads/');
  
  // Calcular valores fiscales correctos para ejemplo
  const baseAmount = 200.00;
  const taxRate = 21;
  const taxAmount = baseAmount * (taxRate / 100);
  const irpfRate = 15; // Retención típica para autónomos
  const irpfAmount = -(baseAmount * (irpfRate / 100)); // Valor NEGATIVO para IRPF
  const total = baseAmount + taxAmount + irpfAmount;
  
  // Crear datos simulados para el recibo con IRPF correcto
  return {
    success: true,
    documentUrl: publicUrl,
    extractedData: {
      date: new Date().toISOString().split('T')[0],
      description: "Factura de servicios",
      amount: parseFloat(total.toFixed(2)), // Redondeamos a 2 decimales
      baseAmount: baseAmount,
      tax: taxRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      irpf: irpfRate, // Porcentaje como valor positivo
      irpfAmount: parseFloat(irpfAmount.toFixed(2)), // Cantidad como valor negativo
      provider: "Empresa de servicios",
      categoryHint: "Servicios generales"
    }
  };
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
  
  // Crear un objeto de impuestos adicionales basado en los datos extraídos
  const additionalTaxes = [];
  
  // Si hay IVA, lo añadimos
  if (extractedData.tax > 0) {
    additionalTaxes.push({
      name: "IVA",
      rate: extractedData.tax,
      amount: extractedData.taxAmount,
      baseAmount: extractedData.baseAmount
    });
  }
  
  // Si hay IRPF, lo añadimos (asegurándonos de que el importe sea negativo)
  if (extractedData.irpf > 0) {
    // Asegurarnos de que el importe del IRPF sea negativo
    const irpfAmount = extractedData.irpfAmount <= 0 
      ? extractedData.irpfAmount  // Ya es negativo, lo mantenemos
      : -extractedData.irpfAmount; // Si es positivo, lo convertimos a negativo
    
    additionalTaxes.push({
      name: "IRPF",
      rate: extractedData.irpf,
      amount: irpfAmount,
      baseAmount: extractedData.baseAmount
    });
  }
  
  // Convertir la fecha extraída a un objeto Date
  const dateObj = new Date(extractedData.date);
  
  // Asegurarnos de que el monto esté en formato string
  const amountStr = typeof extractedData.amount === 'number' 
    ? extractedData.amount.toString() 
    : extractedData.amount;
  
  // Crear el objeto de transacción
  const result = {
    userId,
    title: `${extractedData.provider || 'Proveedor'} - ${extractedData.description}`,
    description: extractedData.description,
    amount: amountStr,
    date: dateObj,
    type: 'expense', // Asumimos que los documentos escaneados son gastos
    categoryId,
    paymentMethod: 'other',
    notes: `Documento escaneado de ${extractedData.provider || 'proveedor'}.\nImporte base: ${extractedData.baseAmount}€.\nIVA (${extractedData.tax}%): +${extractedData.taxAmount}€${extractedData.irpf > 0 ? `.\nIRPF (${extractedData.irpf}%): ${extractedData.irpfAmount}€` : ''}\nTotal: ${extractedData.amount}€`,
    additionalTaxes: additionalTaxes.length > 0 ? additionalTaxes : null
  };
  
  console.log("Transacción mapeada:", JSON.stringify(result, null, 2));
  
  return result;
}