// Definiciones globales para la aplicación
interface Window {
  /**
   * Bandera global para forzar el refresco completo del dashboard
   * Cuando está a true, se ignora cualquier caché y se obtienen datos frescos
   */
  forceDashboardRefresh: boolean;
}