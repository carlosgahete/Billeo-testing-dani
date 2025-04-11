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
  const { user, isLoading } = useAuth();

  // Si estamos cargando los datos del usuario, mostrar un indicador de carga más ligero
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Si no hay usuario, redirigir al inicio de sesión
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Renderizar el componente dentro de Suspense para cargas asíncronas
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
  const { user, isLoading } = useAuth();

  // Si estamos cargando los datos del usuario, mostrar un indicador de carga
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Si no hay usuario o no es administrador, redirigir
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  // Si el usuario no es administrador o superadmin, redirigir al dashboard
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'SUPERADMIN') {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  // Renderizar el componente dentro de Suspense para cargas asíncronas
  return (
    <Suspense fallback={<LazyLoader />}>
      <Component />
    </Suspense>
  );
}