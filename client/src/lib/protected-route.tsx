import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { lazy, Suspense, useEffect } from "react";

// Función de carga optimizada para componentes
const LazyLoader = () => (
  <div className="flex items-center justify-center h-[calc(100vh-200px)]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.FC<{}>;
}) {
  return (
    <Route path={path}>
      <ProtectedRouteGuard component={Component} route={path} />
    </Route>
  );
}

// Componente interno para la protección real
function ProtectedRouteGuard({
  component: Component,
  route,
}: {
  component: React.FC<{}>;
  route: string;
}) {
  const { user, isLoading, refreshUser } = useAuth();

  // Si estamos cargando los datos del usuario, mostrar un indicador de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hay usuario, mostrar mensaje de redirección
  if (!user) {
    console.log(`⛔ ProtectedRouteGuard: Acceso denegado a ${route} - Usuario no autenticado (Redirigiendo...)`);
    
    // Redirección explícita
    return (
      <div className="text-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Acceso restringido. Redirigiendo al login...</p>
        <Redirect to="/auth" />
      </div>
    );
  }

  // Usuario autenticado - Renderizar el componente
  console.log(`✅ ProtectedRouteGuard: Acceso permitido a ${route} - Usuario: ${user.username}`);
  return (
    <Suspense fallback={<LazyLoader />}>
      <Component />
    </Suspense>
  );
}

export function ProtectedAdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.FC<{}>;
}) {
  return (
    <Route path={path}>
      <ProtectedAdminRouteGuard component={Component} route={path} />
    </Route>
  );
}

// Componente interno para la protección de rutas de administrador
function ProtectedAdminRouteGuard({
  component: Component,
  route,
}: {
  component: React.FC<{}>;
  route: string;
}) {
  const { user, isLoading, refreshUser } = useAuth();

  // Si estamos cargando los datos del usuario, mostrar un indicador de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hay usuario, mostrar mensaje de redirección
  if (!user) {
    console.log(`⛔ ProtectedAdminRouteGuard: Acceso denegado a ${route} - Usuario no autenticado (Redirigiendo...)`);
    
    // Redirección explícita
    return (
      <div className="text-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Acceso restringido. Redirigiendo al login...</p>
        <Redirect to="/auth" />
      </div>
    );
  }
  
  // Si el usuario no es administrador, redirigir al dashboard
  if (user.role !== 'admin' && 
      user.role !== 'superadmin' && 
      user.role !== 'SUPERADMIN' && 
      user.username !== 'Superadmin' &&
      user.username !== 'billeo_admin') {
    console.log(`⛔ ProtectedAdminRouteGuard: Acceso denegado a ${route} - Usuario ${user.username} no tiene permisos de administrador (Redirigiendo...)`);
    
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 mb-4">Acceso solo para administradores. Redirigiendo al dashboard...</p>
        <Redirect to="/" />
      </div>
    );
  }

  // Usuario administrador autenticado - Renderizar el componente
  console.log(`✅ ProtectedAdminRouteGuard: Acceso permitido a ${route} - Admin: ${user.username}`);
  return (
    <Suspense fallback={<LazyLoader />}>
      <Component />
    </Suspense>
  );
}