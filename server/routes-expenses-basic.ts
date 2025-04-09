// Ruta básica para crear gastos con validaciones mínimas
// Este archivo se debe importar en server/index.ts

import express from 'express';
import { storage } from './storage';

export function configureBetterExpenseRoutes(app: express.Express) {
  // Middleware para verificar autenticación
  const authenticatedRoute = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.session && req.session.userId) {
      next();
    } else {
      res.status(401).json({ message: "No autenticado" });
    }
  };

  // Ruta para crear un gasto básico
  app.post('/api/expenses/better', authenticatedRoute, async (req: express.Request, res: express.Response) => {
    console.log('Recibida solicitud de creación de gasto básico:', req.body);
    try {
      // Validaciones mínimas
      const { description, amount, attachments = [] } = req.body;
      
      if (!description || description.trim().length < 3) {
        return res.status(400).json({ error: 'La descripción es requerida y debe tener al menos 3 caracteres' });
      }
      
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'El importe es requerido y debe ser un número válido' });
      }
      
      // Preparar los datos completos de la transacción
      const transactionData = {
        title: `Gasto: ${description.substring(0, 30)}`,
        description,
        type: 'expense',
        amount: amount.toString(),
        date: new Date(),
        attachments,
        userId: req.session.userId,
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
      
      res.status(201).json({ success: true, transaction });
    } catch (error) {
      console.error('Error al crear gasto básico:', error);
      res.status(500).json({ error: 'Error interno del servidor al crear el gasto' });
    }
  });
}