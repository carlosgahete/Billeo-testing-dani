import express from 'express';
import { sendAlertNotification } from './services/emailService';

const router = express.Router();

// Endpoint para enviar un correo de prueba
router.post('/send-test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Se requiere una dirección de correo electrónico' });
    }
    
    // Enviar correo de prueba usando el sistema de alertas
    const result = await sendAlertNotification(
      email,
      'Usuario de Prueba',
      'test_notification',
      {
        title: 'Correo de prueba de formato',
        message: 'Este es un correo de prueba para verificar el formato del logo y los estilos del correo electrónico.'
      }
    );
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: 'Correo de prueba enviado correctamente',
        previewUrl: result.previewUrl
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al enviar el correo de prueba',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error al procesar la solicitud de correo de prueba:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;