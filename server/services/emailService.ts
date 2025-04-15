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
        port: parseInt(process.env.SMTP_PORT || '465'), // Usar la variable de entorno o 465 por defecto
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

// Logo de Billeo en base64 para asegurar que aparece en todos los clientes de email
const logoBase64 = 'data:image/png;base64,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';

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
            <img src="${logoBase64}" alt="Billeo" style="width: 150px; height: auto;">
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
  senderEmail: string = 'contacto@billeo.es', // Usar dirección de correo fija y válida
  ccEmail?: string
) {
  console.log("Email del remitente:", senderEmail);
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
            <img src="${logoBase64}" alt="${companyName}" style="width: 150px; height: auto;">
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

// Función para enviar notificaciones de alerta
export async function sendAlertNotification(
  recipientEmail: string,
  recipientName: string,
  alertType: string,
  alertDetails: {
    title: string;
    message: string;
    date?: string;
    amount?: number;
    dueDate?: string;
    entityName?: string;
    entityNumber?: string;
  },
  companyName: string = 'Billeo',
  senderEmail: string = 'contacto@billeo.es'
) {
  if (!transporter) {
    await initEmailService();
  }
  
  // Preparar contenido basado en el tipo de alerta
  let subject = '';
  let messageTitle = '';
  let messageContent = '';
  let actionText = '';
  let bgColor = '';
  let iconEmoji = '';
  
  switch (alertType.toLowerCase()) {
    case 'factura_vencida':
      subject = `⚠️ Alerta: Factura vencida - ${alertDetails.entityNumber || ''}`;
      messageTitle = 'Factura vencida';
      messageContent = `La factura ${alertDetails.entityNumber || ''} de ${alertDetails.entityName || ''} por importe de ${alertDetails.amount ? alertDetails.amount.toFixed(2) + '€' : ''} ha vencido el ${alertDetails.dueDate || ''}.`;
      actionText = 'Revisar factura';
      bgColor = '#FFEBEE';
      iconEmoji = '⚠️';
      break;
    case 'factura_proxima_vencer':
      subject = `🔔 Recordatorio: Factura próxima a vencer - ${alertDetails.entityNumber || ''}`;
      messageTitle = 'Factura próxima a vencer';
      messageContent = `La factura ${alertDetails.entityNumber || ''} de ${alertDetails.entityName || ''} por importe de ${alertDetails.amount ? alertDetails.amount.toFixed(2) + '€' : ''} vencerá el ${alertDetails.dueDate || ''}.`;
      actionText = 'Ver detalles';
      bgColor = '#FFF8E1';
      iconEmoji = '🔔';
      break;
    case 'impuestos_proximos':
      subject = `📋 Recordatorio: Próximo pago de impuestos`;
      messageTitle = 'Próximo pago de impuestos';
      messageContent = `Recuerda que el próximo pago de ${alertDetails.title || 'impuestos'} debe realizarse antes del ${alertDetails.dueDate || ''}.`;
      actionText = 'Ver calendario fiscal';
      bgColor = '#E3F2FD';
      iconEmoji = '📋';
      break;
    default:
      subject = `${alertDetails.title || 'Notificación importante'} - Billeo`;
      messageTitle = alertDetails.title || 'Notificación importante';
      messageContent = alertDetails.message || '';
      actionText = 'Ver detalles';
      bgColor = '#F1F8E9';
      iconEmoji = '📢';
  }
  
  try {
    const currentDate = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const appUrl = process.env.APP_URL || 'https://app.billeo.es';

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoBase64}" alt="${companyName}" style="width: 150px; height: auto;">
        </div>
        
        <p>Hola <strong>${recipientName}</strong>,</p>
        
        <div style="background-color: ${bgColor}; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h2 style="margin-top: 0; color: #2563eb;">${iconEmoji} ${messageTitle}</h2>
          <p>${messageContent}</p>
          ${alertDetails.date ? `<p><strong>Fecha:</strong> ${alertDetails.date}</p>` : ''}
        </div>
        
        <p>Por favor, revisa esta información en tu cuenta de Billeo.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">${actionText}</a>
        </div>
        
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        
        <p>Saludos cordiales,<br>${companyName}</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8em; color: #888; text-align: center;">
          <p>© ${new Date().getFullYear()} ${companyName}. Todos los derechos reservados.</p>
          <p>Este correo fue enviado el ${currentDate}</p>
        </div>
      </div>
    `;
    
    const textMessage = `
Hola ${recipientName},

${messageTitle}

${messageContent}
${alertDetails.date ? `Fecha: ${alertDetails.date}` : ''}

Por favor, revisa esta información en tu cuenta de Billeo.

Si tienes alguna pregunta, no dudes en contactarnos.

Saludos cordiales,
${companyName}

© ${new Date().getFullYear()} ${companyName}. Todos los derechos reservados.
Este correo fue enviado el ${currentDate}
    `;
    
    const emailOptions: nodemailer.SendMailOptions = {
      from: `"${companyName}" <${senderEmail}>`,
      to: recipientEmail,
      subject: subject,
      text: textMessage,
      html: htmlMessage
    };
    
    console.log(`Enviando notificación de alerta a: ${recipientEmail}`);
    console.log(`Tipo de alerta: ${alertType}`);
    
    const info = await transporter.sendMail(emailOptions);
    console.log('Email de alerta enviado: %s', info.messageId);
    
    // Para cuentas de prueba, mostrar URL de vista previa
    if (process.env.NODE_ENV !== 'production' && info.messageId && nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('URL de vista previa: %s', previewUrl);
      return {
        success: true,
        previewUrl
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al enviar notificación de alerta:', error);
    return { success: false, error };
  }
}

export async function sendQuoteEmail(
  recipientEmail: string, 
  recipientName: string, 
  quoteNumber: string,
  pdfBuffer: Buffer,
  companyName: string = 'Billeo',
  senderEmail: string = 'contacto@billeo.es', // Usar dirección de correo fija y válida
  ccEmail?: string,
  validUntil?: string // Añadir fecha de validez como parámetro opcional
) {
  console.log("Email del remitente:", senderEmail);
  if (!transporter) {
    await initEmailService();
  }
  
  try {
    // Convertir Buffer a Stream para el adjunto
    const pdfStream = new Readable();
    pdfStream.push(pdfBuffer);
    pdfStream.push(null); // Señal de fin de stream
    
    // Formatear la fecha de validez si está disponible
    let validityMessage = '';
    if (validUntil) {
      const date = new Date(validUntil);
      const formattedDate = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      validityMessage = `\nEste presupuesto es válido hasta el ${formattedDate}.`;
    }
    
    const emailOptions: nodemailer.SendMailOptions = {
      from: `"${companyName}" <${senderEmail}>`,
      to: recipientEmail,
      subject: `Presupuesto ${quoteNumber} - ${companyName}`,
      text: `
Estimado/a ${recipientName},

Adjunto encontrará el presupuesto ${quoteNumber} en formato PDF.${validityMessage}

Por favor, revise los detalles y no dude en contactarnos si tiene alguna pregunta.

Saludos cordiales,
${companyName}
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoBase64}" alt="${companyName}" style="width: 150px; height: auto;">
          </div>
          
          <p>Estimado/a <strong>${recipientName}</strong>,</p>
          
          <p>Adjunto encontrará el presupuesto <strong>${quoteNumber}</strong> en formato PDF.</p>
          
          ${validUntil ? `<p style="background-color: #FFEBEE; border: 1px solid #E57373; padding: 10px; border-radius: 4px; color: #C62828; font-weight: bold;">Este presupuesto es válido hasta el ${new Date(validUntil).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })}</p>` : ''}
          
          <p>Por favor, revise los detalles y no dude en contactarnos si tiene alguna pregunta.</p>
          
          <p>Saludos cordiales,<br>${companyName}</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8em; color: #888; text-align: center;">
            <p>© ${new Date().getFullYear()} ${companyName}. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Presupuesto_${quoteNumber}.pdf`,
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
      console.log('Email de presupuesto enviado: %s', info.messageId);
      
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
    console.error('Error al enviar presupuesto por correo:', error);
    return { success: false, error };
  }
}