import nodemailer from 'nodemailer';

// Configuración del transportador de correo
// Para pruebas, podemos usar una cuenta de prueba de Ethereal
// En producción, aquí configurarías tu servicio SMTP real (Gmail, SendGrid, etc.)
let transporter: nodemailer.Transporter;

// Inicializa el transportador de correo
export async function initEmailService() {
  try {
    // Crear una cuenta de prueba en ethereal.email (solo para desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Configurando servicio de email para desarrollo...');
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
      // Configuración para producción usando variables de entorno
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
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
      from: `"Billeo" <${process.env.SMTP_USER || 'noreply@billeo.app'}>`,
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