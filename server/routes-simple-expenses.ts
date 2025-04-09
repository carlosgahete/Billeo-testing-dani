import express from 'express';
import { storage } from './storage';

export function configureSimpleExpensesRoutes(app: express.Express) {
  app.post('/api/expenses/simple', async (req: express.Request, res: express.Response) => {
    console.log('Recibida solicitud para gastos simple con body:', JSON.stringify(req.body));
    
    try {
      // ID de usuario fijo para pruebas
      const userId = 1;
      
      // Extraer datos básicos
      const { description, amount, attachments = [] } = req.body;
      
      console.log('Datos extraídos:', { description, amount, attachments });
      
      // Validaciones mínimas
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: 'La descripción es requerida y debe ser texto' 
        });
      }
      
      if (!amount || typeof amount !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: 'El importe es requerido y debe ser texto' 
        });
      }
      
      // Crear la transacción
      const transaction = await storage.createTransaction({
        title: `Gasto: ${description.substring(0, 30)}`,
        description,
        type: 'expense',
        amount,
        date: new Date(),
        attachments,
        userId,
        categoryId: null,
        paymentMethod: null,
        notes: null,
        additionalTaxes: null,
        invoiceId: null
      });
      
      console.log('Transacción simple creada correctamente:', transaction);
      
      // Enviar respuesta
      res.status(201).json({
        success: true,
        transaction
      });
      
    } catch (error) {
      console.error('Error en endpoint simple de gastos:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    }
  });
}