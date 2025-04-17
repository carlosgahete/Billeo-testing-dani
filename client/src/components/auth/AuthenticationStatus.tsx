import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { LogIn, AlertCircle, Lock } from 'lucide-react';

interface AuthenticationStatusProps {
  statusTitle?: string;
  statusDescription?: string;
  showLoginButton?: boolean;
  className?: string;
}

export const AuthenticationStatus: React.FC<AuthenticationStatusProps> = ({
  statusTitle = 'Acceso Restringido',
  statusDescription = 'Debes iniciar sesión para acceder a esta sección.',
  showLoginButton = true,
  className = '',
}) => {
  const [_, navigate] = useLocation();

  const handleLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-4">
      <Card className={`w-full max-w-md border border-yellow-300 shadow-lg ${className}`}>
        <CardHeader className="bg-yellow-50 border-b border-yellow-100">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <CardTitle className="text-yellow-700">{statusTitle}</CardTitle>
          </div>
          <CardDescription>{statusDescription}</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-col items-center text-center gap-4">
            <Lock className="h-16 w-16 text-yellow-500 mb-2" />
            <p className="text-gray-600">
              Tu sesión ha expirado o no has iniciado sesión.
              Para acceder a tus datos financieros, es necesario verificar tu identidad.
            </p>
          </div>
        </CardContent>
        {showLoginButton && (
          <CardFooter className="flex justify-center border-t border-yellow-100 pt-4">
            <Button onClick={handleLogin} className="w-full md:w-auto">
              <LogIn className="mr-2 h-4 w-4" />
              Iniciar Sesión
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default AuthenticationStatus;