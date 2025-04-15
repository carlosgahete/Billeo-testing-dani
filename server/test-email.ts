import express, { Router } from 'express';
import { initEmailService } from './services/emailService';
import { BILLEO_LOGO_URL } from './services/billeo-logo-url';
import { User } from '../shared/schema';
import type { Request, Response } from 'express';

// Plantilla base para correos de prueba
function getTestEmailTemplate(emailType: string = 'general'): string {
  const billeoLogoUrl = BILLEO_LOGO_URL;
  
  // Contenido común del correo
  let emailHeader = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Correo de prueba de Billeo</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
      }
      .header {
        text-align: center;
        padding: 20px 0;
        background-color: #f8f9fa;
      }
      .logo {
        max-width: 150px;
      }
      .content {
        padding: 20px;
        background-color: #ffffff;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #6c757d;
        background-color: #f8f9fa;
      }
      .button {
        display: inline-block;
        padding: 10px 20px;
        background-color: #007bff;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 4px;
        margin-top: 20px;
      }
      .card {
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      }
      .highlight {
        background-color: #f1f8ff;
        padding: 10px;
        border-left: 4px solid #007bff;
        margin-bottom: 20px;
      }
      .alert {
        background-color: #fff3cd;
        padding: 10px;
        border-left: 4px solid #ffc107;
        margin-bottom: 20px;
      }
      h1, h2, h3 {
        color: #007bff;
      }
      a {
        color: #007bff;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Billeo</h1>
        <img src="${billeoLogoUrl}" alt="Billeo Logo" class="logo" />
      </div>
      <div class="content">
  `;

  let emailContent = '';
  let emailFooter = `
      </div>
      <div class="footer">
        <p>Este es un correo de prueba enviado desde Billeo.</p>
        <p>© ${new Date().getFullYear()} Billeo - Todos los derechos reservados.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  // Diferentes plantillas según el tipo
  switch (emailType) {
    case 'factura_vencida':
      emailContent = `
        <h2>Alerta: Factura Vencida</h2>
        <div class="alert">
          <p>La factura <strong>FAC-2023-001</strong> ha vencido el <strong>01/04/2025</strong>.</p>
        </div>
        <div class="card">
          <h3>Detalles de la Factura</h3>
          <p><strong>Cliente:</strong> Ejemplo S.L.</p>
          <p><strong>Importe:</strong> 1.200,00 €</p>
          <p><strong>Fecha de emisión:</strong> 01/03/2025</p>
          <p><strong>Fecha de vencimiento:</strong> 01/04/2025</p>
          <p><strong>Estado:</strong> Vencida</p>
        </div>
        <p>Es importante realizar un seguimiento de esta factura. Puede revisar los detalles y actualizar su estado desde su panel de control.</p>
        <a href="#" class="button">Ver Factura</a>
      `;
      break;
    
    case 'proxima_vencer':
      emailContent = `
        <h2>Recordatorio: Factura Próxima a Vencer</h2>
        <div class="highlight">
          <p>La factura <strong>FAC-2023-002</strong> vencerá en <strong>3 días</strong> (el 18/04/2025).</p>
        </div>
        <div class="card">
          <h3>Detalles de la Factura</h3>
          <p><strong>Cliente:</strong> Empresa Ejemplo S.A.</p>
          <p><strong>Importe:</strong> 850,00 €</p>
          <p><strong>Fecha de emisión:</strong> 01/04/2025</p>
          <p><strong>Fecha de vencimiento:</strong> 18/04/2025</p>
          <p><strong>Estado:</strong> Pendiente</p>
        </div>
        <p>Le recomendamos revisar esta factura y realizar cualquier acción necesaria antes de su vencimiento.</p>
        <a href="#" class="button">Ver Factura</a>
      `;
      break;
    
    case 'tarea_pendiente':
      emailContent = `
        <h2>Recordatorio: Tarea Pendiente</h2>
        <div class="highlight">
          <p>La tarea <strong>Preparar declaración trimestral IVA</strong> vence en <strong>2 días</strong>.</p>
        </div>
        <div class="card">
          <h3>Detalles de la Tarea</h3>
          <p><strong>Título:</strong> Preparar declaración trimestral IVA</p>
          <p><strong>Fecha límite:</strong> 17/04/2025</p>
          <p><strong>Prioridad:</strong> Alta</p>
          <p><strong>Descripción:</strong> Reunir todas las facturas del trimestre y preparar la declaración de IVA para presentarla dentro del plazo.</p>
        </div>
        <p>No olvide completar esta tarea importante antes de la fecha límite.</p>
        <a href="#" class="button">Ver Tarea</a>
      `;
      break;
  
    default:
      emailContent = `
        <h2>Correo de Prueba de Billeo</h2>
        <p>¡Hola!</p>
        <p>Este es un correo electrónico de prueba enviado desde la aplicación Billeo. Si estás recibiendo este correo, significa que la configuración de correo electrónico funciona correctamente.</p>
        
        <div class="card">
          <h3>Información sobre Billeo</h3>
          <p>Billeo es tu asistente personal para la gestión financiera de autónomos y freelancers, diseñado específicamente para el mercado español.</p>
          <p>Con Billeo puedes:</p>
          <ul>
            <li>Gestionar facturas y presupuestos</li>
            <li>Controlar gastos e ingresos</li>
            <li>Calcular impuestos (IVA, IRPF)</li>
            <li>Generar informes financieros</li>
            <li>Recibir alertas sobre vencimientos</li>
          </ul>
        </div>
        
        <p>Este correo es solo una prueba y no requiere ninguna acción por tu parte.</p>
        
        <div class="highlight">
          <p>Las notificaciones por correo electrónico te ayudarán a mantenerte al día con tus obligaciones financieras y fiscales.</p>
        </div>
      `;
      break;
  }

  return emailHeader + emailContent + emailFooter;
}

// Configuración del router
const router = Router();

// Punto de entrada principal para probar que la ruta funciona
router.get('/', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'API de prueba de correo funcionando correctamente'
  });
});

// Ruta para enviar un correo de prueba
router.post('/send-test-email', async (req: Request, res: Response) => {
  try {
    const { email, type = 'general' } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere una dirección de correo electrónico' 
      });
    }

    // Inicializar el servicio de email
    const emailService = await initEmailService();
    
    // Obtener la plantilla según el tipo
    const emailTemplate = getTestEmailTemplate(type);
    
    // Tipo de correo y asunto
    let subject = 'Correo de prueba de Billeo';
    switch (type) {
      case 'factura_vencida':
        subject = 'Alerta: Factura Vencida [Billeo]';
        break;
      case 'proxima_vencer':
        subject = 'Recordatorio: Factura Próxima a Vencer [Billeo]';
        break;
      case 'tarea_pendiente':
        subject = 'Recordatorio: Tarea Pendiente [Billeo]';
        break;
    }

    // Enviar el correo
    const result = await emailService.send({
      to: email,
      subject,
      html: emailTemplate
    });

    if (result.success) {
      const response: any = { 
        success: true, 
        message: 'Correo de prueba enviado correctamente'
      };
      
      // Añadir previewUrl solo si existe en el resultado
      if ('previewUrl' in result && result.previewUrl) {
        response.previewUrl = result.previewUrl;
      }
      
      return res.status(200).json(response);
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al enviar el correo de prueba',
        error: result.error || 'Error desconocido'
      });
    }
  } catch (error) {
    console.error('Error en ruta send-test-email:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor al enviar el correo de prueba'
    });
  }
});

// Ruta para mostrar los tipos de correos disponibles para pruebas
router.get('/test-email-types', (_req: Request, res: Response) => {
  const emailTypes = [
    { id: 'general', name: 'Correo General' },
    { id: 'factura_vencida', name: 'Alerta de Factura Vencida' },
    { id: 'proxima_vencer', name: 'Recordatorio de Factura Próxima a Vencer' },
    { id: 'tarea_pendiente', name: 'Recordatorio de Tarea Pendiente' }
  ];
  
  return res.status(200).json({ 
    success: true, 
    types: emailTypes
  });
});

export default router;