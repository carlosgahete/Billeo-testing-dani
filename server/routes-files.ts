import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import { requireAuth } from './auth-middleware';

const router = Router();

// Configuración de multer para la subida de archivos
const uploadDir = path.join(process.cwd(), 'uploads');

// Asegurar que el directorio de uploads existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Directorio de uploads creado en:', uploadDir);
}

// Configurar el almacenamiento para multer
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = randomUUID();
    const extension = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${extension}`);
  }
});

// Función para validar tipos de archivo
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Lista de tipos MIME permitidos
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no soportado. Por favor, sube una imagen, PDF o documento.'));
  }
};

// Crear el middleware de subida configurado
const upload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB tamaño máximo
  },
  fileFilter
});

// Ruta para subir archivos
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    const { file } = req;
    const userId = req.user.id;
    const entityType = req.body.entityType || null;
    const entityId = req.body.entityId ? parseInt(req.body.entityId) : null;
    
    // Determinar el tipo de archivo
    let fileType = 'document';
    if (file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (file.mimetype === 'application/pdf') {
      fileType = 'pdf';
    }

    // Guardar los metadatos del archivo en la base de datos
    const fileRecord = await storage.createFile({
      userId,
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimeType: file.mimetype,
      fileType,
      entityType,
      entityId,
      uploadDate: new Date(),
      thumbnailPath: null,
      isDeleted: false
    });

    console.log('Archivo subido y guardado correctamente:', fileRecord);

    res.status(201).json({
      success: true,
      message: 'Archivo subido correctamente',
      filePath: file.path,
      fileId: fileRecord.id
    });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir el archivo'
    });
  }
});

// Ruta para eliminar archivos
router.delete('/delete', requireAuth, async (req, res) => {
  try {
    const { filePath } = req.body;
    const userId = req.user.id;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'No se ha especificado la ruta del archivo'
      });
    }

    // Buscar el archivo en la base de datos
    const fileRecord = await storage.getFileByPath(filePath);

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar que el usuario tiene permisos para eliminar el archivo
    if (fileRecord.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este archivo'
      });
    }

    // Marcar el archivo como eliminado en la base de datos
    await storage.markFileAsDeleted(fileRecord.id);

    // Eliminar el archivo físicamente (opcional, se puede mantener y solo ocultar en la interfaz)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsError) {
      console.error('Error al eliminar el archivo físicamente:', fsError);
      // No fallamos la petición si no se puede eliminar físicamente
    }

    res.status(200).json({
      success: true,
      message: 'Archivo eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el archivo'
    });
  }
});

// Ruta para descargar archivos
router.get('/download', requireAuth, async (req, res) => {
  try {
    const { filePath } = req.query;
    const userId = req.user.id;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'No se ha especificado la ruta del archivo'
      });
    }

    // Buscar el archivo en la base de datos
    const fileRecord = await storage.getFileByPath(filePath);

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar que el usuario tiene permisos para descargar el archivo
    // (en este caso, cualquier usuario autenticado puede descargar)

    // Comprobar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado en el sistema de archivos'
      });
    }

    // Configurar los headers para la descarga
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);
    res.setHeader('Content-Type', fileRecord.mimeType);

    // Enviar el archivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar el archivo'
    });
  }
});

// Ruta para previsualizar archivos
router.get('/preview', requireAuth, async (req, res) => {
  try {
    const { filePath } = req.query;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'No se ha especificado la ruta del archivo'
      });
    }

    // Buscar el archivo en la base de datos
    const fileRecord = await storage.getFileByPath(filePath);

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Comprobar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado en el sistema de archivos'
      });
    }

    // Para imágenes, enviamos directamente
    if (fileRecord.mimeType.startsWith('image/')) {
      res.setHeader('Content-Type', fileRecord.mimeType);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      // Para otros tipos, enviamos un 'inline' Content-Disposition
      res.setHeader('Content-Disposition', `inline; filename="${fileRecord.originalName}"`);
      res.setHeader('Content-Type', fileRecord.mimeType);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error('Error al previsualizar archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al previsualizar el archivo'
    });
  }
});

// Ruta para obtener metadatos de un archivo
router.get('/metadata', requireAuth, async (req, res) => {
  try {
    const { filePath } = req.query;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'No se ha especificado la ruta del archivo'
      });
    }

    // Buscar el archivo en la base de datos
    const fileRecord = await storage.getFileByPath(filePath);

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Devolver los metadatos del archivo
    res.status(200).json({
      success: true,
      metadata: {
        id: fileRecord.id,
        userId: fileRecord.userId,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        path: fileRecord.path,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
        fileType: fileRecord.fileType,
        entityType: fileRecord.entityType,
        entityId: fileRecord.entityId,
        uploadDate: fileRecord.uploadDate,
        thumbnailPath: fileRecord.thumbnailPath
      }
    });
  } catch (error) {
    console.error('Error al obtener metadatos del archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener metadatos del archivo'
    });
  }
});

// Ruta para obtener archivos por entidad
router.get('/by-entity', requireAuth, async (req, res) => {
  try {
    const { entityType, entityId } = req.query;

    if (!entityType || !entityId || typeof entityType !== 'string' || typeof entityId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Se requieren el tipo y el ID de la entidad'
      });
    }

    const entityIdNum = parseInt(entityId);
    
    // Buscar los archivos por entidad en la base de datos
    const files = await storage.getFilesByEntity(entityType, entityIdNum);

    // Devolver las rutas de los archivos
    res.status(200).json({
      success: true,
      files: files.map(file => file.path)
    });
  } catch (error) {
    console.error('Error al obtener archivos por entidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener archivos por entidad'
    });
  }
});

// Función para configurar las rutas de archivos en la aplicación
export const configureFileRoutes = (app: any) => {
  app.use('/api/files', router);
  console.log('Rutas de archivos configuradas correctamente');
};

// Exportar el router para pruebas o uso directo
export { router as filesRouter };