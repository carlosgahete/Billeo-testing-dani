import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';

// Configuración de multer para subir archivos
const upload = multer({
  dest: 'uploads/', // Directorio donde se guardarán los archivos
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB
  },
  fileFilter: (_req, file, cb) => {
    // Verificar tipo de archivo
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG y PNG son permitidos.'));
    }
  },
});

export function configureExpensesRoutes(app: express.Express) {
  // Ruta para crear un gasto con FormData (incluye archivo)
  app.post('/api/expenses', upload.single('attachment'), async (req, res) => {
    console.log('Recibida solicitud para crear gasto con FormData');
    console.log('Cuerpo de la solicitud:', req.body);
    console.log('Archivo recibido:', req.file);

    try {
      // ID de usuario fijo para pruebas
      const userId = 1;
      
      // Extraer datos del formulario
      const { description, amount, date } = req.body;
      
      // Validaciones básicas
      if (!description || !amount) {
        return res.status(400).json({
          success: false,
          error: 'La descripción y el importe son obligatorios'
        });
      }
      
      // Procesar el importe (asegurarse de que es un número válido)
      let cleanedAmount = String(amount).replace(',', '.').trim();
      const numericAmount = parseFloat(cleanedAmount);
      
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'El importe debe ser un número válido y mayor que cero'
        });
      }
      
      // Formatear el importe con 2 decimales
      cleanedAmount = numericAmount.toFixed(2);
      
      // Procesar la fecha
      let transactionDate;
      try {
        transactionDate = date ? new Date(date) : new Date();
        if (isNaN(transactionDate.getTime())) {
          transactionDate = new Date(); // Si no es válida, usar fecha actual
        }
      } catch (e) {
        transactionDate = new Date();
      }
      
      // Procesar el archivo
      let filePath = '';
      if (req.file) {
        // Renombrar el archivo para incluir la fecha y evitar colisiones
        const timestamp = Date.now();
        const newFileName = `${timestamp}-${req.file.originalname}`;
        const newFilePath = path.join('uploads', newFileName);
        
        fs.renameSync(req.file.path, newFilePath);
        filePath = newFilePath;
      }
      
      // Crear la transacción
      const transaction = await storage.createTransaction({
        title: `Gasto: ${description.substring(0, 30)}`,
        description,
        type: 'expense',
        amount: cleanedAmount,
        date: transactionDate,
        attachments: filePath ? [filePath] : [],
        userId,
        categoryId: null,
        paymentMethod: null,
        notes: null,
        additionalTaxes: null,
        invoiceId: null
      });
      
      console.log('Transacción creada correctamente:', transaction);
      
      res.status(201).json({
        success: true,
        transaction
      });
      
    } catch (error) {
      console.error('Error al crear gasto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });
}