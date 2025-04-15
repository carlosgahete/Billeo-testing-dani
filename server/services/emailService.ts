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
    
    const appUrl = process.env.APP_URL || 'https://app.billeo.es';
    const logoUrl = `${appUrl}/images/billeo-logo.svg`;
    
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
            <img src="${logoUrl}" alt="${companyName}" style="width: 150px; height: auto;">
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
    const logoUrl = `${appUrl}/images/billeo-logo.svg`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="${companyName}" style="width: 150px; height: auto;">
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
    
    const appUrl = process.env.APP_URL || 'https://app.billeo.es';
    const logoUrl = `${appUrl}/images/billeo-logo.svg`;
    
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
            <img src="${logoUrl}" alt="${companyName}" style="width: 150px; height: auto;">
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