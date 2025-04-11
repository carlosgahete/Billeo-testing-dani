// Ruta super directa para crear gastos (sin validaciones complejas)
// Este archivo se debe importar en server/index.ts

import express from 'express';
import { storage } from './storage';

export function configureDirectExpenseRoutes(app: express.Express) {
  // Ruta para crear un gasto de la forma más directa posible - SIN autenticación para pruebas
  app.post('/api/expenses/direct', async (req: express.Request, res: express.Response) => {
    // Configurar CORS para permitir solicitudes desde cualquier origen
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    try {
      console.log('Recibida solicitud para crear gasto directo:', req.body);
      
      // Verificar que el usuario esté autenticado
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ 
          success: false, 
          message: "Se requiere autenticación para crear gastos" 
        });
      }
      
      // Usar el ID del usuario autenticado
      const userId = req.session.userId;
      
      // Extraer datos del cuerpo de la solicitud (sin validaciones estrictas)
      const { description, amount, attachments = [] } = req.body;
      
      // Datos de la transacción con valores predeterminados
      const transactionData = {
        userId: userId,
        title: `Gasto: ${description?.substring(0, 30) || 'Sin descripción'}`,
        description: description || 'Sin descripción',
        type: 'expense',
        amount: amount?.toString() || '0', 
        date: new Date(),
        attachments: Array.isArray(attachments) ? attachments : [],
        categoryId: null,
        paymentMethod: null,
        notes: null,
        additionalTaxes: null,
        invoiceId: null
      };
      
      // Crear la transacción en la base de datos
      const transaction = await storage.createTransaction(transactionData);
      console.log('Transacción creada exitosamente:', transaction);
      
      // Devolver respuesta exitosa
      res.status(201).json({ 
        success: true, 
        transaction,
        message: 'Gasto creado correctamente'
      });
    } catch (error) {
      console.error('Error al crear gasto directo:', error);
      res.status(500).json({ 
        error: 'Error al crear el gasto', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  });
}