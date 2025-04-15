import { storage } from '../storage';
import { Transaction, Invoice, Quote, User, Task } from '@shared/schema';
import { sendAlertNotification } from './emailService';

// Interfaz para configurar los umbrales de las alertas
interface AlertThresholds {
  invoiceDaysBeforeDue: number; // Días antes de que venza una factura para alertar
  invoiceDaysAfterDue: number; // Días después de vencida una factura para alertar
  taskDaysBeforeDue: number; // Días antes de que venza una tarea para alertar
  taxReturnDaysBeforeDue: number; // Días antes de la fecha de presentación de impuestos para alertar
  minInvoiceAmount: number; // Monto mínimo de factura para enviar alertas (para no enviar por montos pequeños)
}

// Configuración por defecto para umbrales de alertas
const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  invoiceDaysBeforeDue: 3, // Alerta 3 días antes de que venza una factura
  invoiceDaysAfterDue: 1, // Alerta 1 día después de que venció una factura
  taskDaysBeforeDue: 2, // Alerta 2 días antes de que venza una tarea
  taxReturnDaysBeforeDue: 7, // Alerta 7 días antes de la fecha de presentación de impuestos
  minInvoiceAmount: 50 // Monto mínimo de factura para alertas: 50€
};

// Clase para el servicio de alertas
export class AlertService {
  private thresholds: AlertThresholds;
  
  constructor(thresholds?: Partial<AlertThresholds>) {
    // Usar los umbrales proporcionados o los valores por defecto
    this.thresholds = {
      ...DEFAULT_ALERT_THRESHOLDS,
      ...thresholds
    };
  }
  
  // Detectar y enviar alertas para todas las entidades de un usuario
  public async checkAndSendAlerts(userId: number): Promise<{
    success: boolean;
    alertsSent: number;
    errors: any[];
  }> {
    try {
      // Obtener el usuario
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`No se encontró el usuario con ID ${userId}`);
        return { success: false, alertsSent: 0, errors: [{ message: 'Usuario no encontrado' }] };
      }
      
      // Verificar preferencias de notificaciones del usuario
      const preferences = await storage.getDashboardPreferences(userId);
      if (!preferences || preferences.emailNotifications === false) {
        console.log(`Usuario ${userId} tiene las notificaciones desactivadas o no tiene preferencias configuradas`);
        return { success: true, alertsSent: 0, errors: [] };
      }
      
      let alertsSent = 0;
      const errors: any[] = [];
      
      // Comprobar facturas pendientes de pago
      const invoiceAlerts = await this.checkInvoiceAlerts(userId, user);
      alertsSent += invoiceAlerts.alertsSent;
      errors.push(...invoiceAlerts.errors);
      
      // Comprobar tareas próximas a vencer
      const taskAlerts = await this.checkTaskAlerts(userId, user);
      alertsSent += taskAlerts.alertsSent;
      errors.push(...taskAlerts.errors);
      
      // Comprobar fechas de presentación de impuestos
      // Este método podría implementarse más adelante
      // const taxAlerts = await this.checkTaxAlerts(userId, user);
      // alertsSent += taxAlerts.alertsSent;
      // errors.push(...taxAlerts.errors);
      
      return {
        success: true,
        alertsSent,
        errors
      };
      
    } catch (error) {
      console.error(`Error al procesar alertas para el usuario ${userId}:`, error);
      return {
        success: false,
        alertsSent: 0,
        errors: [error]
      };
    }
  }
  
  // Comprobar alertas de facturas (próximas a vencer o vencidas)
  private async checkInvoiceAlerts(userId: number, user: User): Promise<{
    alertsSent: number;
    errors: any[];
  }> {
    const alertsSent = 0;
    const errors: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    
    try {
      // Obtener todas las facturas del usuario
      const invoices = await storage.getInvoicesByUserId(userId);
      
      // Filtrar solo facturas pendientes o impagadas
      const relevantInvoices = invoices.filter(invoice => 
        (invoice.status === 'pending' || invoice.status === 'overdue') && 
        parseFloat(invoice.total) >= this.thresholds.minInvoiceAmount
      );
      
      let sent = 0;
      
      // Procesar cada factura relevante
      for (const invoice of relevantInvoices) {
        try {
          const dueDate = new Date(invoice.dueDate);
          dueDate.setHours(0, 0, 0, 0); // Normalizar a inicio del día
          
          // Calcular diferencia en días
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Comprobar si la factura está próxima a vencer
          if (diffDays > 0 && diffDays <= this.thresholds.invoiceDaysBeforeDue) {
            // Obtener información del cliente
            const client = await storage.getClient(invoice.clientId);
            const clientName = client ? client.name : 'Cliente';
            
            // Enviar alerta de factura próxima a vencer
            const result = await sendAlertNotification(
              user.email,
              user.name,
              'factura_proxima_vencer',
              {
                title: 'Factura próxima a vencer',
                message: `La factura ${invoice.invoiceNumber} vencerá pronto.`,
                dueDate: dueDate.toLocaleDateString('es-ES'),
                amount: parseFloat(invoice.total),
                entityName: clientName,
                entityNumber: invoice.invoiceNumber
              }
            );
            
            if (result.success) {
              sent++;
            } else {
              errors.push({
                message: 'Error al enviar alerta de factura próxima a vencer',
                invoiceId: invoice.id,
                error: result.error
              });
            }
          }
          // Comprobar si la factura está vencida
          else if (diffDays < 0 && Math.abs(diffDays) <= this.thresholds.invoiceDaysAfterDue) {
            // Obtener información del cliente
            const client = await storage.getClient(invoice.clientId);
            const clientName = client ? client.name : 'Cliente';
            
            // Enviar alerta de factura vencida
            const result = await sendAlertNotification(
              user.email,
              user.name,
              'factura_vencida',
              {
                title: 'Factura vencida',
                message: `La factura ${invoice.invoiceNumber} ha vencido.`,
                dueDate: dueDate.toLocaleDateString('es-ES'),
                amount: parseFloat(invoice.total),
                entityName: clientName,
                entityNumber: invoice.invoiceNumber
              }
            );
            
            if (result.success) {
              sent++;
            } else {
              errors.push({
                message: 'Error al enviar alerta de factura vencida',
                invoiceId: invoice.id,
                error: result.error
              });
            }
          }
        } catch (invoiceError) {
          errors.push({
            message: 'Error al procesar factura para alertas',
            invoiceId: invoice.id,
            error: invoiceError
          });
        }
      }
      
      return { alertsSent: sent, errors };
      
    } catch (error) {
      console.error('Error al comprobar alertas de facturas:', error);
      errors.push({
        message: 'Error al obtener facturas para alertas',
        error
      });
      return { alertsSent, errors };
    }
  }
  
  // Comprobar alertas de tareas (próximas a vencer)
  private async checkTaskAlerts(userId: number, user: User): Promise<{
    alertsSent: number;
    errors: any[];
  }> {
    const alertsSent = 0;
    const errors: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    
    try {
      // Obtener todas las tareas del usuario
      const tasks = await storage.getTasksByUserId(userId);
      
      // Filtrar solo tareas no completadas con fecha de vencimiento
      const relevantTasks = tasks.filter(task => 
        !task.completed && task.dueDate !== null
      );
      
      let sent = 0;
      
      // Procesar cada tarea relevante
      for (const task of relevantTasks) {
        try {
          if (!task.dueDate) continue; // Verificación adicional
          
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0); // Normalizar a inicio del día
          
          // Calcular diferencia en días
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Comprobar si la tarea está próxima a vencer
          if (diffDays > 0 && diffDays <= this.thresholds.taskDaysBeforeDue) {
            // Enviar alerta de tarea próxima a vencer
            const priorityLabels = {
              low: 'baja',
              medium: 'media',
              high: 'alta'
            };
            
            const result = await sendAlertNotification(
              user.email,
              user.name,
              'tarea_proxima_vencer',
              {
                title: 'Tarea pendiente',
                message: `La tarea "${task.title}" está pendiente y vence pronto.`,
                dueDate: dueDate.toLocaleDateString('es-ES'),
                entityName: `Prioridad ${priorityLabels[task.priority as keyof typeof priorityLabels] || task.priority}`,
                entityNumber: task.id.toString()
              }
            );
            
            if (result.success) {
              sent++;
            } else {
              errors.push({
                message: 'Error al enviar alerta de tarea próxima a vencer',
                taskId: task.id,
                error: result.error
              });
            }
          }
        } catch (taskError) {
          errors.push({
            message: 'Error al procesar tarea para alertas',
            taskId: task.id,
            error: taskError
          });
        }
      }
      
      return { alertsSent: sent, errors };
      
    } catch (error) {
      console.error('Error al comprobar alertas de tareas:', error);
      errors.push({
        message: 'Error al obtener tareas para alertas',
        error
      });
      return { alertsSent, errors };
    }
  }
}

// Exportar instancia por defecto del servicio
export const alertService = new AlertService();

// Función para comprobar y enviar alertas para todos los usuarios
export async function checkAndSendAlertsForAllUsers(): Promise<{
  success: boolean;
  processedUsers: number;
  alertsSent: number;
  errors: any[];
}> {
  try {
    const users = await storage.getAllUsers();
    let processedUsers = 0;
    let totalAlertsSent = 0;
    const errors: any[] = [];
    
    for (const user of users) {
      try {
        const result = await alertService.checkAndSendAlerts(user.id);
        processedUsers++;
        totalAlertsSent += result.alertsSent;
        errors.push(...result.errors);
      } catch (userError) {
        errors.push({
          message: `Error al procesar alertas para el usuario ${user.id}`,
          userId: user.id,
          error: userError
        });
      }
    }
    
    return {
      success: true,
      processedUsers,
      alertsSent: totalAlertsSent,
      errors
    };
    
  } catch (error) {
    console.error('Error al comprobar alertas para todos los usuarios:', error);
    return {
      success: false,
      processedUsers: 0,
      alertsSent: 0,
      errors: [error]
    };
  }
}