import express from 'express';
import { storage } from './storage';

export function configureSimpleExpensesRoutes(app: express.Express) {
  app.post('/api/expenses/simple', async (req: express.Request, res: express.Response) => {
    console.log('Recibida solicitud para gastos simple con body:', req.body);
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Tipo de datos recibidos amount:', typeof req.body.amount);
    console.log('Valor literal de amount:', req.body.amount);
    
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
      console.log('Tipo de amount después de extraer:', typeof amount);
      
      // Validaciones mínimas
      if (!description) {
        description = "Gasto sin descripción";
      }
      
      // Normalizar el formato del importe (convertir a número)
      console.log('ANTES DE NORMALIZAR - Tipo de amount:', typeof amount, 'Valor:', amount);
      
      if (typeof amount === 'string') {
        console.log('Procesando amount como string');
        // Reemplazar coma por punto si existe
        let normalizedAmount = amount.replace(',', '.');
        console.log('Amount después de reemplazar coma por punto:', normalizedAmount);
        
        try {
          // Convertir a número y luego formatear con 2 decimales
          const numericAmount = parseFloat(normalizedAmount);
          console.log('Amount convertido a número:', numericAmount, 'Es NaN?', isNaN(numericAmount));
          
          if (isNaN(numericAmount)) {
            amount = "0.00";
            console.log('Amount es NaN, usando default:', amount);
          } else {
            amount = numericAmount.toFixed(2);
            console.log('Amount formateado con 2 decimales:', amount);
          }
        } catch (e) {
          console.error('Error al convertir amount a número:', e);
          amount = "0.00";
        }
      } else if (typeof amount === 'number') {
        console.log('Procesando amount como número:', amount);
        amount = amount.toFixed(2);
        console.log('Amount formateado con 2 decimales:', amount);
      } else {
        console.log('Tipo de amount desconocido, usando default');
        amount = "0.00";
      }
      
      console.log('DESPUÉS DE NORMALIZAR - Tipo de amount:', typeof amount, 'Valor final:', amount);
      
      // Comprobar si envió una fecha personalizada
      let transactionDate;
      if (req.body.date) {
        try {
          transactionDate = new Date(req.body.date);
          // Verificar que sea una fecha válida
          if (isNaN(transactionDate.getTime())) {
            transactionDate = new Date(); // Si no es válida, usar fecha actual
          }
        } catch (e) {
          transactionDate = new Date();
        }
      } else {
        transactionDate = new Date();
      }
      
      // Crear la transacción
      console.log('Creando transacción con amount:', amount, 'tipo:', typeof amount, 'después de todo el procesamiento');
      console.log('Objetos transformados a formato JSON:', JSON.stringify({ amount, description, transactionDate, attachments }));
      
      const transaction = await storage.createTransaction({
        title: `Gasto: ${description.substring(0, 30)}`,
        description,
        type: 'expense',
        amount,
        date: transactionDate,
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