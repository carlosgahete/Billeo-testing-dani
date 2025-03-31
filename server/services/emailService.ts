import nodemailer from 'nodemailer';
import { Readable } from 'stream';

// Configuración del transportador de correo
// Para pruebas, podemos usar una cuenta de prueba de Ethereal
// En producción, aquí configurarías tu servicio SMTP real (Hostinger, Gmail, SendGrid, etc.)
let transporter: nodemailer.Transporter;

// Inicializa el transportador de correo
export async function initEmailService() {
  try {
    // Verificar si tenemos credenciales SMTP configuradas
    if (process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD) {
      // Usar credenciales reales de Hostinger
      console.log('Configurando servicio de email con credenciales de Hostinger...');
      console.log(`Host: ${process.env.SMTP_HOST}`);
      console.log('Puerto: 465 (hardcoded)');
      console.log(`Usuario: ${process.env.SMTP_USERNAME}`);
      console.log('Secure: true (hardcoded)');
      
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 465, // Puerto para Hostinger
        secure: true, // true para puerto 465
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
        debug: true, // Para ver logs detallados de la conexión SMTP
      });
      console.log('Configuración SMTP con cuenta real completada.');
    } 
    // Fallback a cuenta de prueba si no hay credenciales configuradas
    else if (process.env.NODE_ENV !== 'production') {
      console.log('Configurando servicio de email para desarrollo (cuenta de prueba)...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`Cuenta de prueba creada: ${testAccount.user}`);
    } else {
      // Configuración predeterminada como último recurso
      transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USERNAME || 'noreply@billeo.app',
          pass: process.env.SMTP_PASSWORD || 'password',
        },
      });
    }
    
    console.log('Servicio de email inicializado correctamente');
    return true;
  } catch (error) {
    console.error('Error al inicializar servicio de email:', error);
    return false;
  }
}

// Función para enviar correo de recuperación de contraseña
export async function sendPasswordResetEmail(email: string, token: string, username: string) {
  if (!transporter) {
    await initEmailService();
  }
  
  // URL base de la aplicación
  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  const resetUrl = `${baseUrl}/reset-password/${token}`;
  
  try {
    const info = await transporter.sendMail({
      from: `"Billeo" <${process.env.SMTP_USERNAME || 'noreply@billeo.app'}>`,
      to: email,
      subject: "Recuperación de contraseña - Billeo",
      text: `Hola ${username},\n\nHas solicitado restablecer tu contraseña. Para continuar, haz clic en el siguiente enlace:\n\n${resetUrl}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste este cambio, puedes ignorar este correo.\n\nSaludos,\nEquipo de Billeo`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2563eb;">Billeo</h1>
          </div>
          
          <p>Hola <strong>${username}</strong>,</p>
          
          <p>Has solicitado restablecer tu contraseña. Para continuar, haz clic en el siguiente enlace:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Restablecer contraseña</a>
          </div>
          
          <p style="font-size: 0.9em; color: #666;">Este enlace expirará en 1 hora.</p>
          
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          
          <p>Saludos,<br>Equipo de Billeo</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8em; color: #888; text-align: center;">
            <p>© ${new Date().getFullYear()} Billeo. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
    });
    
    // Para cuentas de prueba, mostrar URL de vista previa
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      console.log('Email enviado: %s', info.messageId);
      console.log('URL de vista previa: %s', nodemailer.getTestMessageUrl(info));
      return {
        success: true,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al enviar correo de recuperación:', error);
    return { success: false, error };
  }
}

// Función para enviar facturas por correo electrónico
export async function sendInvoiceEmail(
  recipientEmail: string, 
  recipientName: string, 
  invoiceNumber: string,
  pdfBuffer: Buffer,
  companyName: string = 'Billeo',
  senderEmail: string = process.env.SMTP_USERNAME || 'noreply@billeo.app',
  ccEmail?: string
) {
  if (!transporter) {
    await initEmailService();
  }
  
  try {
    // Convertir Buffer a Stream para el adjunto
    const pdfStream = new Readable();
    pdfStream.push(pdfBuffer);
    pdfStream.push(null); // Señal de fin de stream
    
    const emailOptions: nodemailer.SendMailOptions = {
      from: `"${companyName}" <${senderEmail}>`,
      to: recipientEmail,
      subject: `Factura ${invoiceNumber} - ${companyName}`,
      text: `
Estimado/a ${recipientName},

Adjunto encontrará la factura ${invoiceNumber} en formato PDF.

Por favor, revise los detalles y no dude en contactarnos si tiene alguna pregunta.

Saludos cordiales,
${companyName}
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2563eb;">${companyName}</h1>
          </div>
          
          <p>Estimado/a <strong>${recipientName}</strong>,</p>
          
          <p>Adjunto encontrará la factura <strong>${invoiceNumber}</strong> en formato PDF.</p>
          
          <p>Por favor, revise los detalles y no dude en contactarnos si tiene alguna pregunta.</p>
          
          <p>Saludos cordiales,<br>${companyName}</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8em; color: #888; text-align: center;">
            <p>© ${new Date().getFullYear()} ${companyName}. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Factura_${invoiceNumber}.pdf`,
          content: pdfStream,
          contentType: 'application/pdf'
        }
      ]
    };
    
    // Añadir CC si se proporciona
    if (ccEmail) {
      emailOptions.cc = ccEmail;
    }
    
    console.log(`Enviando email a: ${recipientEmail}`);
    console.log(`Desde: ${emailOptions.from}`);
    console.log(`Asunto: ${emailOptions.subject}`);
    
    try {
      const info = await transporter.sendMail(emailOptions);
      console.log('Respuesta del servidor SMTP:', info);
      console.log('Email de factura enviado: %s', info.messageId);
      
      // Para cuentas de prueba, mostrar URL de vista previa
      if (process.env.NODE_ENV !== 'production' && info.messageId && nodemailer.getTestMessageUrl) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('URL de vista previa: %s', previewUrl);
        return {
          success: true,
          previewUrl
        };
      }
    } catch (emailError) {
      console.error('Error específico al enviar el email:', emailError);
      throw emailError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al enviar factura por correo:', error);
    return { success: false, error };
  }
}