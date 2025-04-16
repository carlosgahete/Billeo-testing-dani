import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { lazy, Suspense } from "react";

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
  const { user, isLoading } = useAuth();

  // Si estamos cargando los datos del usuario, mostrar un indicador de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    console.log(`⛔ ProtectedRouteGuard: Acceso denegado a ${route} - Usuario no autenticado (Redirigiendo...)`);
    return <Redirect to="/auth" />;
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
  const { user, isLoading } = useAuth();

  // Si estamos cargando los datos del usuario, mostrar un indicador de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    console.log(`⛔ ProtectedAdminRouteGuard: Acceso denegado a ${route} - Usuario no autenticado (Redirigiendo...)`);
    return <Redirect to="/auth" />;
  }
  
  // Si el usuario no es administrador, redirigir al dashboard
  if (user.role !== 'admin' && 
      user.role !== 'superadmin' && 
      user.role !== 'SUPERADMIN' && 
      user.username !== 'Superadmin' &&
      user.username !== 'billeo_admin') {
    console.log(`⛔ ProtectedAdminRouteGuard: Acceso denegado a ${route} - Usuario ${user.username} no tiene permisos de administrador (Redirigiendo...)`);
    return <Redirect to="/" />;
  }

  // Usuario administrador autenticado - Renderizar el componente
  console.log(`✅ ProtectedAdminRouteGuard: Acceso permitido a ${route} - Admin: ${user.username}`);
  return (
    <Suspense fallback={<LazyLoader />}>
      <Component />
    </Suspense>
  );
}