// Definir los tipos necesarios para funcionar con usuarios
// En lugar de importar del esquema, lo definimos directamente para evitar dependencias circulares
type User = {
  id: number;
  username: string;
  role: string;
  [key: string]: any;
};

type OriginalAdmin = {
  id: number;
  username: string;
  role: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
};

/**
 * Lista de nombres de usuario que siempre tienen permisos de superadmin
 */
export const SUPERADMIN_USERNAMES = [
  'admin',
  'danielperla',
  'perlancelot',
  'billeo_admin',
  'Superadmin'
];

/**
 * Determina si un usuario tiene permisos de superadmin,
 * ya sea por su rol explícito o por estar en la lista de usernames con privilegios.
 * También considera si hay información de un admin original que tenga privilegios.
 */
export function isSuperAdmin(
  user: User | null | undefined,
  originalAdmin: OriginalAdmin | null = null
): boolean {
  // Si hay un admin original con privilegios, el usuario actual tiene privilegios heredados
  if (originalAdmin && originalAdmin.isSuperAdmin) {
    return true;
  }

  // Si no hay usuario, no puede ser superadmin
  if (!user) {
    return false;
  }

  // Si el rol del usuario es explícitamente superadmin
  if (user.role === 'superadmin' || user.role === 'SUPERADMIN') {
    return true;
  }

  // Si el nombre de usuario está en la lista blanca de superadmins
  if (user.username && SUPERADMIN_USERNAMES.includes(user.username)) {
    return true;
  }

  return false;
}

/**
 * Función simplificada para determinar si un usuario es superadmin
 * basado únicamente en su información (sin considerar admin original)
 */
export function isUserSuperAdmin(user: User | null | undefined): boolean {
  return isSuperAdmin(user, null);
}