/**
 * Tests para las funciones de cálculos fiscales
 * 
 * Este archivo contiene pruebas unitarias para verificar el correcto
 * funcionamiento de los cálculos de base imponible, IVA e IRPF.
 */

import { calcularBaseConImpuestos, calcularBaseConTasas, detectarPosibleIRPF } from '../utils/taxUtils';

describe('calcularBaseConImpuestos', () => {
  test('Calcula correctamente la base imponible con solo IVA', () => {
    // Caso: Factura con total de 121€ e IVA de 21€
    // Base esperada: 121 - 21 + 0 = 100€
    const total = 121;
    const iva = 21;
    const base = calcularBaseConImpuestos(total, iva);
    
    expect(base).toBe(100);
  });
  
  test('Calcula correctamente la base imponible con IVA e IRPF', () => {
    // Caso: Factura con total de 106€, IVA de 21€ e IRPF de 15€
    // Base esperada: 106 - 21 + 15 = 100€
    const total = 106;
    const iva = 21;
    const irpf = 15;
    const base = calcularBaseConImpuestos(total, iva, irpf);
    
    expect(base).toBe(100);
  });
  
  test('Maneja correctamente valores decimales', () => {
    // Caso: Factura con total de 93.17€, IVA de 10.17€ e IRPF de 7€
    // Base esperada: 93.17 - 10.17 + 7 = 90€
    const total = 93.17;
    const iva = 10.17;
    const irpf = 7;
    const base = calcularBaseConImpuestos(total, iva, irpf);
    
    expect(base).toBe(90);
  });
  
  test('Funciona con IRPF igual a 0', () => {
    // Verificamos que funciona correctamente cuando no hay IRPF
    const total = 242;
    const iva = 42;
    const base = calcularBaseConImpuestos(total, iva, 0);
    
    expect(base).toBe(200);
  });
});

describe('calcularBaseConTasas', () => {
  test('Calcula correctamente con IVA 21% sin IRPF', () => {
    // Caso: Factura con total de 121€, IVA al 21%
    const total = 121;
    const ivaRate = 21;
    const result = calcularBaseConTasas(total, ivaRate);
    
    expect(result.base).toBe(100);
    expect(result.ivaImporte).toBe(21);
    expect(result.irpfImporte).toBe(0);
  });
  
  test('Calcula correctamente con IVA 21% e IRPF 15%', () => {
    // Caso: Factura con total de 106€, IVA al 21%, IRPF al 15%
    const total = 106;
    const ivaRate = 21;
    const irpfRate = 15;
    const result = calcularBaseConTasas(total, ivaRate, irpfRate);
    
    expect(result.base).toBe(100);
    expect(result.ivaImporte).toBe(21);
    expect(result.irpfImporte).toBe(15);
  });
  
  test('Calcula correctamente con IVA 10% e IRPF 15%', () => {
    // Caso: Factura con total de 95€, IVA al 10%, IRPF al 15%
    const total = 95;
    const ivaRate = 10;
    const irpfRate = 15;
    const result = calcularBaseConTasas(total, ivaRate, irpfRate);
    
    expect(result.base).toBe(100);
    expect(result.ivaImporte).toBe(10);
    expect(result.irpfImporte).toBe(15);
  });
});

describe('detectarPosibleIRPF', () => {
  test('Detecta correctamente importes típicos con IRPF', () => {
    expect(detectarPosibleIRPF(106)).toBe(true); // Total típico para base=100, IVA=21, IRPF=15
    expect(detectarPosibleIRPF(530)).toBe(true); // Total típico para base=500, IVA=105, IRPF=75
    expect(detectarPosibleIRPF(1060)).toBe(true); // Patrón similar a 106
    expect(detectarPosibleIRPF(318.32)).toBe(true); // Otro patrón típico con IRPF
  });
  
  test('No detecta como IRPF importes normales', () => {
    expect(detectarPosibleIRPF(121)).toBe(false); // Típico solo IVA 21%
    expect(detectarPosibleIRPF(100)).toBe(false); // Importe redondo
    expect(detectarPosibleIRPF(150)).toBe(false); // Otro importe redondo
    expect(detectarPosibleIRPF(212.45)).toBe(false); // Importe aleatorio
  });
});