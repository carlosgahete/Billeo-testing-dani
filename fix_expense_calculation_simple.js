// Solución temporal para el problema de pérdida de datos
// Esta función debe ser llamada antes de cambiar de categoría

function preserveFormData() {
  // Recuperar todos los elementos del formulario
  const form = document.querySelector('form');
  if (!form) return null;
  
  // Crear un objeto para almacenar los valores
  const formData = {};
  
  // Obtener todos los inputs del formulario
  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    // Guardar valor con el ID como clave
    if (input.id) {
      formData[input.id] = input.value;
    }
  });
  
  // Guardar valores adicionales importantes
  const taxAmountEl = document.querySelector('[id$="-iva"] + div');
  const irpfAmountEl = document.querySelector('[id$="-irpf"] + div');
  
  if (taxAmountEl) formData['taxAmount'] = taxAmountEl.textContent;
  if (irpfAmountEl) formData['irpfAmount'] = irpfAmountEl.textContent;
  
  // Almacenar en sessionStorage para recuperar después del cambio
  sessionStorage.setItem('preserved-form-data', JSON.stringify(formData));
  
  return formData;
}

function restoreFormData() {
  // Recuperar datos guardados
  const savedData = sessionStorage.getItem('preserved-form-data');
  if (!savedData) return false;
  
  try {
    const formData = JSON.parse(savedData);
    
    // Restaurar valores a los inputs
    Object.keys(formData).forEach(id => {
      if (id === 'taxAmount' || id === 'irpfAmount') return; // Estos se manejan aparte
      
      const input = document.getElementById(id);
      if (input) {
        input.value = formData[id];
      }
    });
    
    // Restaurar valores calculados
    const taxAmountEl = document.querySelector('[id$="-iva"] + div');
    const irpfAmountEl = document.querySelector('[id$="-irpf"] + div');
    
    if (taxAmountEl && formData.taxAmount) taxAmountEl.textContent = formData.taxAmount;
    if (irpfAmountEl && formData.irpfAmount) irpfAmountEl.textContent = formData.irpfAmount;
    
    // Limpiar después de usar
    sessionStorage.removeItem('preserved-form-data');
    
    return true;
  } catch (e) {
    console.error('Error al restaurar datos del formulario:', e);
    return false;
  }
}

// Función para forzar un recálculo
function updateCalculations() {
  // Disparar eventos de cambio en los campos base
  const baseInput = document.getElementById('transaction-base');
  const taxInput = document.getElementById('transaction-iva');
  const irpfInput = document.getElementById('transaction-irpf');
  
  if (baseInput) {
    const event = new Event('change', { bubbles: true });
    baseInput.dispatchEvent(event);
  }
  
  if (taxInput) {
    const event = new Event('change', { bubbles: true });
    taxInput.dispatchEvent(event);
  }
  
  if (irpfInput) {
    const event = new Event('change', { bubbles: true });
    irpfInput.dispatchEvent(event);
  }
}

// Exportar funciones para uso
export { preserveFormData, restoreFormData, updateCalculations };