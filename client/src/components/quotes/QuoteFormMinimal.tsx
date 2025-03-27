import React from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Interfaz mínima para las props
interface QuoteFormMinimalProps {
  quoteId?: number;
}

const QuoteFormMinimal: React.FC<QuoteFormMinimalProps> = ({ quoteId }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Página en construcción',
      description: 'La funcionalidad de creación de presupuestos está en desarrollo',
    });
    navigate('/quotes');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{quoteId ? 'Editar Presupuesto' : 'Crear Presupuesto Básico'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Esta es una versión simplificada del formulario de presupuestos para solucionar
            problemas técnicos. Pronto estará disponible la versión completa.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate('/quotes')}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Guardar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default QuoteFormMinimal;