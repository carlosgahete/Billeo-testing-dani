import express from 'express';
import { storage } from './storage';

export function configureSimpleExpensesRoutes(app: express.Express) {
  app.post('/api/expenses/simple', async (req: express.Request, res: express.Response) => {
    console.log('Recibida solicitud para gastos simple con body:', JSON.stringify(req.body));
    
    try {
      // ID de usuario fijo para pruebas
      const userId = 1;
      
      // Extraer datos básicos
      let { description, amount, attachments = [] } = req.body;
      
      // Si es un formulario tradicional, los attachments vendrán como string
      if (typeof attachments === 'string') {
        attachments = [attachments];
      }
      
      console.log('Datos extraídos:', { description, amount, attachments });
      
      // Validaciones mínimas - si no hay descripción, usar valor por defecto
      if (!description) {
        description = "Gasto manual";
      }
      
      // Si el importe no es válido, usar valor por defecto
      if (!amount) {
        amount = "0.00";
      }
      
      // Intentar hacer un parsing del amount por si acaso
      try {
        if (typeof amount !== 'string') {
          amount = amount.toString();
        }
      } catch (e) {
        amount = "0.00";
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
      
      // Determinar el tipo de respuesta que espera el cliente
      const acceptHeader = req.headers.accept;
      if (acceptHeader && acceptHeader.includes('text/html')) {
        // El cliente espera HTML (probablemente un formulario tradicional)
        res.status(200).send(`
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
        // El cliente espera JSON
        res.status(201).json({
          success: true,
          transaction
        });
      }
      
    } catch (error) {
      console.error('Error en endpoint simple de gastos:', error);
      
      // Determinar el tipo de respuesta
      const acceptHeader = req.headers.accept;
      if (acceptHeader && acceptHeader.includes('text/html')) {
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