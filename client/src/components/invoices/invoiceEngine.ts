import { UseFormReturn } from 'react-hook-form'

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

interface AdditionalTax {
  name: string;
  amount?: number;
  rate?: number;
}

interface InvoiceFormData {
  items: InvoiceItem[];
  additionalTaxes: AdditionalTax[];
  subtotal?: number;
  taxes?: number;
  total?: number;
}

// Versión para usar con valores directos (sin form)
export function calculateInvoice(data: any) {
  const items = data.items || []
  const additionalTaxes = data.additionalTaxes || []

  // Calcular subtotal sumando todos los items
  let subtotal = 0
  items.forEach((item: any) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.price) || 0
    subtotal += quantity * unitPrice
  })

  // Calcular impuestos solo si hay impuestos definidos
  let taxes = 0
  additionalTaxes.forEach((tax: any) => {
    // Permitimos rates negativos (ej: -21 para IRPF)
    // .rate es para el formato nuevo y .amount para compatibilidad con formato anterior
    // Manejar casos especiales como cuando el valor es "-" (cuando el usuario está escribiendo)
    let rateVal = tax.rate !== undefined ? tax.rate : tax.amount;
    
    // Si es un string y sólo contiene el signo menos, tratarlo como 0 temporalmente
    if (rateVal === "-") {
      console.log("Detectado valor incompleto '-', usando 0 temporalmente");
      rateVal = 0;
    }
    
    const rate = Number(rateVal) || 0
    taxes += subtotal * (rate / 100)
    
    // Log para debugging
    console.log(`Calculando impuesto ${tax.name || 'sin nombre'}: Tasa ${rate}%, Base ${subtotal}€, Resultado: ${(subtotal * (rate / 100)).toFixed(2)}€`);
  })

  // No añadir impuestos automáticamente si no hay ninguno definido
  // Solo se aplican los impuestos que el usuario ha añadido explícitamente

  // Calcular total
  const total = subtotal + taxes

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxes: parseFloat(taxes.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  }
}