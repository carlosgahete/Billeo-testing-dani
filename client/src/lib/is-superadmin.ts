/**
 * Función para verificar si un usuario es superadmin basado en su rol o nombre de usuario
 */
export const isSuperAdmin = (user: any): boolean => {
  if (!user) return false;
  
  // Lista de nombres de usuario que son superadmins
  const SUPERADMIN_USERNAMES = ['admin', 'danielperla', 'perlancelot', 'billeo_admin', 'Superadmin'];
  
  return (
    user.role === 'superadmin' || 
    user.role === 'SUPERADMIN' ||
    (user.username && SUPERADMIN_USERNAMES.includes(user.username))
  );
};