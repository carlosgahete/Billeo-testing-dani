// Ruta básica para crear gastos con validaciones mínimas
// Este archivo se debe importar en server/index.ts

import express from 'express';
import { storage } from './storage';

export function configureBetterExpenseRoutes(app: express.Express) {
  // Ruta para crear un gasto básico - SIN autenticación para pruebas
  app.post('/api/expenses/better', async (req: express.Request, res: express.Response) => {
    // Configura los encabezados CORS manualmente
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Para solicitudes OPTIONS, responder inmediatamente con OK
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    // Hardcodeamos un ID de usuario para pruebas
    const userId = 1; // Asumimos que existe un usuario con ID 1
    console.log('Recibida solicitud de creación de gasto básico:', req.body);
    try {
      // Validaciones mínimas
      const { description, amount, attachments = [] } = req.body;
      
      console.log('Datos de gasto recibidos:', { description, amount, attachments });
      
      if (!description || typeof description !== 'string' || description.trim().length < 3) {
        return res.status(400).json({ error: 'La descripción es requerida y debe tener al menos 3 caracteres' });
      }
      
      // Validación estricta del formato del importe
      if (!amount || typeof amount !== 'string') {
        return res.status(400).json({ error: 'El importe es requerido y debe ser una cadena de texto' });
      }
      
      // Comprobar que el importe tiene el formato correcto (número con dos decimales)
      const amountRegex = /^\d+\.\d{2}$/;
      if (!amountRegex.test(amount)) {
        return res.status(400).json({ 
          error: 'El importe debe tener un formato válido con dos decimales (por ejemplo, "123.45")',
          format: 'formato esperado: "123.45"',
          received: amount
        });
      }
      
      // Verificar que attachments es un array
      if (!Array.isArray(attachments)) {
        return res.status(400).json({ error: 'El campo attachments debe ser un array' });
      }
      
      // Preparar los datos completos de la transacción
      const transactionData = {
        title: `Gasto: ${description.substring(0, 30)}`,
        description,
        type: 'expense',
        amount: amount.toString(),
        date: new Date(),
        attachments,
        userId: userId,
        // Valores por defecto para los campos opcionales
        categoryId: null,
        paymentMethod: null,
        notes: null,
        additionalTaxes: null,
        invoiceId: null
      };
      
      console.log('Datos de transacción preparados:', transactionData);
      
      // Crear la transacción en la base de datos
      const transaction = await storage.createTransaction(transactionData);
      console.log('Transacción creada correctamente:', transaction);
      
      // Configurar encabezado Content-Type explícitamente
      res.setHeader('Content-Type', 'application/json');
      
      // Devolver respuesta exitosa
      res.status(201).json({ success: true, transaction });
    } catch (error) {
      console.error('Error al crear gasto básico:', error);
      res.status(500).json({ error: 'Error interno del servidor al crear el gasto' });
    }
  });
}