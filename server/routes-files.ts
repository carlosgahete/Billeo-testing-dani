import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { files } from '@shared/schema';

// Configuración del directorio de uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de multer para el almacenamiento de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  }
});

// Configuración de límites y filtros para multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Verificar tipo de archivo
    const allowedMimeTypes = [
      'image/jpeg', 
      'image/png', 
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG), PDFs y documentos Word.'));
    }
  },
});

// Función auxiliar para obtener el tipo MIME
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

// Función auxiliar para manejar archivos (visualización o descarga)
const handleFile = (req: Request, res: Response, forceDownload: boolean = true) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "No autorizado" });
    }
    
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }
    
    // Obtener extensión para determinar el tipo de contenido
    const ext = path.extname(filename).toLowerCase();
    const contentType = getMimeType(ext);
    
    // Generar nombre para descarga
    let downloadName = filename;
    
    // Usar nombre personalizado si se proporciona
    if (req.query.customName) {
      downloadName = String(req.query.customName) + ext;
    } 
    // Si hay información de proveedor, fecha y categoría, usar eso
    else if (req.query.provider && req.query.date && req.query.category) {
      const provider = String(req.query.provider).replace(/[^a-zA-Z0-9\-_]/g, '-');
      const date = String(req.query.date).replace(/[^a-zA-Z0-9\-_]/g, '-');
      const category = String(req.query.category).replace(/[^a-zA-Z0-9\-_]/g, '');
      
      downloadName = `${provider}_${date}_${category}${ext}`;
    } 
    // Si es un nombre generado por multer, usar fecha genérica
    else if (filename.startsWith('file-')) {
      const datePart = filename.split('-')[1] || '';
      const dateFormatted = datePart ? new Date(parseInt(datePart)).toISOString().split('T')[0] : '';
      downloadName = `documento_${dateFormatted || 'descargado'}${ext}`;
    }
    
    // Configurar cabeceras
    res.setHeader('Content-Type', contentType);
    
    // Si es para descarga, agregar cabecera Content-Disposition
    if (forceDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    } else {
      // Para visualización, usar inline para abrir en el navegador si es posible
      res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
    }
    
    // Enviar archivo
    const filestream = fs.createReadStream(filepath);
    filestream.pipe(res);
    
  } catch (error) {
    console.error('Error accessing file:', error);
    return res.status(500).json({ message: "Error al acceder al archivo" });
  }
};

export function configureFileRoutes(app: express.Express) {
  // Ruta para subir archivos
  app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "No autorizado" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No se ha subido ningún archivo" });
      }
      
      // Obtener metadata adicional
      const entityType = req.body.entityType || null;
      const entityId = req.body.entityId ? parseInt(req.body.entityId) : null;
      
      // Determinar tipo de archivo
      let fileType = 'other';
      const mimeType = req.file.mimetype;
      if (mimeType.startsWith('image/')) {
        fileType = 'image';
      } else if (mimeType === 'application/pdf') {
        fileType = 'pdf';
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        fileType = 'document';
      }
      
      // Guardar metadatos en la base de datos si está disponible
      try {
        // Intentar insertar registro en la tabla de archivos
        // Esto depende de si tienes una tabla para archivos en tu esquema
        // Si no existe, simplemente se ignora esta parte
        if (db && files) {
          await db.insert(files).values({
            userId: req.session.userId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: `/uploads/${req.file.filename}`,
            size: req.file.size,
            mimeType: req.file.mimetype,
            fileType,
            entityType,
            entityId,
            uploadDate: new Date()
          });
        }
      } catch (dbError) {
        // Si hay un error en la base de datos, simplemente lo registramos
        // pero seguimos adelante, ya que el archivo ya está guardado en disco
        console.error('Error al guardar metadatos del archivo:', dbError);
      }
      
      // Responder con información del archivo subido
      return res.status(201).json({
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        fileType,
        entityType,
        entityId,
        uploadDate: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error al subir el archivo:', error);
      return res.status(500).json({ 
        message: error.message || "Error al subir el archivo" 
      });
    }
  });
  
  // Ruta para descargar archivos (forzar descarga)
  app.get('/api/download/:filename', (req: Request, res: Response) => {
    handleFile(req, res, true);
  });
  
  // Ruta para visualizar archivos en el navegador
  app.get('/api/view-file/:filename', (req: Request, res: Response) => {
    handleFile(req, res, false);
  });
  
  // Ruta para eliminar archivos
  app.delete('/api/files/:filename', async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "No autorizado" });
      }
      
      const filename = req.params.filename;
      const filepath = path.join(uploadDir, filename);
      
      // Verificar si el archivo existe
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "Archivo no encontrado" });
      }
      
      // Si estamos usando base de datos, eliminar el registro
      try {
        if (db && files) {
          await db.delete(files).where(eq(files.filename, filename));
        }
      } catch (dbError) {
        console.error('Error al eliminar registro de archivo:', dbError);
      }
      
      // Eliminar el archivo físico
      fs.unlinkSync(filepath);
      
      return res.status(200).json({ 
        message: "Archivo eliminado correctamente" 
      });
    } catch (error: any) {
      console.error('Error al eliminar el archivo:', error);
      return res.status(500).json({ 
        message: error.message || "Error al eliminar el archivo" 
      });
    }
  });
  
  // Endpoint para obtener enlaces de descarga para múltiples archivos
  app.post('/api/batch-download-links', async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "No autorizado" });
      }
      
      const { filenames, period } = req.body;
      
      if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
        return res.status(400).json({ message: "No se proporcionaron archivos para descargar" });
      }
      
      // Comprobar que todos los archivos existen y generar enlaces de descarga
      const downloadLinks = [];
      for (const filename of filenames) {
        // Limpiamos el nombre del archivo para obtener solo el nombre sin ruta
        const cleanFilename = filename.split('/').pop() || filename;
        const filepath = path.join(uploadDir, cleanFilename);
        
        if (fs.existsSync(filepath)) {
          // Obtener extensión para determinar el tipo de contenido
          const ext = path.extname(cleanFilename).toLowerCase();
          
          // Generar URL de descarga
          const downloadUrl = `/api/download/${cleanFilename}`;
          downloadLinks.push({
            filename: cleanFilename,
            downloadUrl,
            originalName: cleanFilename,
            formattedName: `documento_${period || ''}_${downloadLinks.length + 1}${ext}`,
            mimeType: getMimeType(ext)
          });
        }
      }
      
      if (downloadLinks.length === 0) {
        return res.status(404).json({ message: "No se encontraron archivos para descargar" });
      }
      
      return res.status(200).json({ downloadLinks });
    } catch (error: any) {
      console.error('Error al procesar enlaces de descarga:', error);
      return res.status(500).json({ 
        message: error.message || "Error al procesar enlaces de descarga" 
      });
    }
  });
  
  // Ruta para obtener metadatos de archivos
  app.get('/api/files/metadata/:filename', async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "No autorizado" });
      }
      
      const filename = req.params.filename;
      const filepath = path.join(uploadDir, filename);
      
      // Verificar si el archivo existe
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "Archivo no encontrado" });
      }
      
      // Obtener estadísticas del archivo
      const stats = fs.statSync(filepath);
      
      // Determinar tipo de archivo
      const ext = path.extname(filename).toLowerCase();
      const mimeType = getMimeType(ext);
      
      let fileType = 'other';
      if (mimeType.startsWith('image/')) {
        fileType = 'image';
      } else if (mimeType === 'application/pdf') {
        fileType = 'pdf';
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        fileType = 'document';
      }
      
      // Intentar obtener metadatos de la base de datos si existe
      let dbMetadata = null;
      try {
        if (db && files) {
          const result = await db.select().from(files).where(eq(files.filename, filename));
          if (result.length > 0) {
            dbMetadata = result[0];
          }
        }
      } catch (dbError) {
        console.error('Error al obtener metadatos del archivo:', dbError);
      }
      
      // Responder con metadatos combinados
      return res.status(200).json({
        filename,
        path: `/uploads/${filename}`,
        size: stats.size,
        mimeType,
        fileType,
        uploadDate: dbMetadata?.uploadDate || stats.ctime.toISOString(),
        originalName: dbMetadata?.originalName || filename,
        entityType: dbMetadata?.entityType || null,
        entityId: dbMetadata?.entityId || null
      });
    } catch (error: any) {
      console.error('Error al obtener metadatos del archivo:', error);
      return res.status(500).json({ 
        message: error.message || "Error al obtener metadatos del archivo" 
      });
    }
  });
}