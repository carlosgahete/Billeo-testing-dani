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
  userId: string;
  title?: string;
  description: string;
  amount: number;
  date: Date;
  type: 'income' | 'expense';
  categoryId: string | null;
  paymentMethod?: string;
  notes?: string;
  additionalTaxes?: any;
}

export async function processReceiptImage(imagePath: string) {
  console.log('Procesando imagen de recibo (simulado):', imagePath);
  
  // Obtener la URL del archivo
  const documentUrl = imagePath.replace(/\\/g, '/');
  const publicUrl = documentUrl.replace('uploads/', '/uploads/');
  
  // Crear datos simulados para el recibo
  return {
    success: true,
    documentUrl: publicUrl,
    extractedData: {
      date: new Date().toISOString().split('T')[0],
      description: "Gastos profesionales",
      amount: 125.40,
      baseAmount: 103.64,
      tax: 21,
      taxAmount: 21.76,
      irpf: 0,
      irpfAmount: 0,
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
  
  // Crear datos simulados para el recibo
  return {
    success: true,
    documentUrl: publicUrl,
    extractedData: {
      date: new Date().toISOString().split('T')[0],
      description: "Factura de servicios",
      amount: 242.00,
      baseAmount: 200.00,
      tax: 21,
      taxAmount: 42.00,
      irpf: 0,
      irpfAmount: 0,
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
  userId: string,
  categoryId: string | null
): TransactionData {
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
  
  // Si hay IRPF, lo añadimos
  if (extractedData.irpf > 0) {
    additionalTaxes.push({
      name: "IRPF",
      rate: extractedData.irpf,
      amount: extractedData.irpfAmount,
      baseAmount: extractedData.baseAmount
    });
  }
  
  // Convertir la fecha extraída a un objeto Date
  const dateObj = new Date(extractedData.date);
  
  // Crear el objeto de transacción
  return {
    userId,
    title: `${extractedData.provider || 'Proveedor'} - ${extractedData.description}`,
    description: extractedData.description,
    amount: extractedData.amount,
    date: dateObj,
    type: 'expense', // Asumimos que los documentos escaneados son gastos
    categoryId,
    paymentMethod: 'other',
    notes: `Documento escaneado de ${extractedData.provider || 'proveedor'}. Importe base: ${extractedData.baseAmount}€. IVA (${extractedData.tax}%): ${extractedData.taxAmount}€.`,
    additionalTaxes: additionalTaxes.length > 0 ? additionalTaxes : null
  };
}