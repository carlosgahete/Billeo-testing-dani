import express from 'express';
import { storage } from './storage';

export function configureSimpleExpensesRoutes(app: express.Express) {
  app.post('/api/expenses/simple', async (req: express.Request, res: express.Response) => {
    console.log('Recibida solicitud para gastos simple con body:', req.body);
    
    try {
      // ID de usuario fijo para pruebas
      const userId = 1;
      
      // Extraer datos básicos - soporta tanto JSON como FormData
      let description = req.body.description || "";
      let amount = req.body.amount || "0.00";
      let attachments: string[] = [];
      
      // Normalizar attachments según el tipo de entrada
      if (req.body.attachments) {
        if (typeof req.body.attachments === 'string') {
          // Es un único string (FormData o JSON simple)
          attachments = [req.body.attachments];
        } else if (Array.isArray(req.body.attachments)) {
          // Es un array (JSON normal)
          attachments = req.body.attachments;
        }
      }
      
      console.log('Datos extraídos y normalizados:', { description, amount, attachments });
      
      // Validaciones mínimas
      if (!description) {
        description = "Gasto sin descripción";
      }
      
      // Normalizar el formato del importe (asegurar que sea string)
      if (typeof amount !== 'string') {
        try {
          amount = amount.toString();
        } catch (e) {
          amount = "0.00";
        }
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
      
      // Determinar el tipo de respuesta según headers
      const contentType = req.get('Content-Type') || '';
      
      // Si es multipart (FormData) o el cliente espera HTML
      if (contentType.includes('multipart/form-data') || 
          (req.headers.accept && req.headers.accept.includes('text/html'))) {
        res.status(201).send(`
          <html>
            <body>
              <h1>Gasto registrado correctamente</h1>
              <p>Se ha registrado un gasto de ${amount}€</p>
              <script>
                window.parent.postMessage({ success: true, transaction: ${JSON.stringify(transaction)} }, '*');
              </script>
            </body>
          </html>
        `);
      } else {
        // Por defecto enviar JSON
        res.status(201).json({
          success: true,
          transaction
        });
      }
      
    } catch (error) {
      console.error('Error en endpoint simple de gastos:', error);
      
      // Determinar el tipo de respuesta según el Content-Type
      const contentType = req.get('Content-Type') || '';
      
      if (contentType.includes('multipart/form-data') || 
          (req.headers.accept && req.headers.accept.includes('text/html'))) {
        res.status(500).send(`
          <html>
            <body>
              <h1>Error al registrar el gasto</h1>
              <p>Hubo un problema al guardar el gasto.</p>
              <script>
                window.parent.postMessage({ success: false, error: 'Error interno del servidor' }, '*');
              </script>
            </body>
          </html>
        `);
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Error interno del servidor' 
        });
      }
    }
  });
}