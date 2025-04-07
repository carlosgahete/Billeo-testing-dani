import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "lucide-react";

export const TestComponent: React.FC = () => {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Componente de prueba</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Este es un componente de prueba para verificar que todo funciona correctamente.</p>
          <div className="flex items-center space-x-2">
            <Button variant="outline">Botón de prueba</Button>
            <Loader className="h-5 w-5 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestComponent;