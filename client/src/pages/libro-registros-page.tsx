import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, PieChart, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const LibroRegistrosSelector: React.FC = () => {
  const { user } = useAuth();
  const hasAccess = user && (user.role === 'superadmin' || user.role === 'SUPERADMIN' || user.role === 'admin');

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>
              Sólo los administradores pueden acceder al Libro de Registros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Libro de Registros</CardTitle>
          <CardDescription>
            Selecciona la versión que deseas visualizar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-primary" />
                  <span>Versión Simple</span>
                </CardTitle>
                <CardDescription>
                  Visualización básica con información esencial.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/libro-simple/1">
                  <Button className="w-full">Acceder</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                  <span>Versión Completa</span>
                </CardTitle>
                <CardDescription>
                  Con filtros avanzados y exportación de datos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/libro-enhanced/1">
                  <Button className="w-full">Acceder</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5 text-primary" />
                  <span>Versión Original</span>
                </CardTitle>
                <CardDescription>
                  Implementación original del Libro de Registros.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/libro-registros/1">
                  <Button className="w-full">Acceder</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          
          <Separator className="my-6" />
          
          <div className="flex justify-end">
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LibroRegistrosSelector;