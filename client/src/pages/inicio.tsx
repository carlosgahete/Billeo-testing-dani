import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Activity, BarChart2, TrendingUp } from "lucide-react";

export default function InicioPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Bienvenido a Billeo</h1>
      
      <div className="mb-8">
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardTitle className="flex items-center">
              <Activity className="mr-2" />
              Resumen Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-lg">
              Billeo es tu herramienta especializada para la gestión financiera de autónomos y freelancers en España.
            </p>
            <p className="mt-4">
              Controla tus facturas, gastos, impuestos y genera informes financieros de forma sencilla y eficiente.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2" />
              Datos Fiscales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p>Accede a información sobre:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Cálculos de IVA repercutido y soportado</li>
              <li>Gestión de retenciones IRPF</li>
              <li>Alertas para los pagos trimestrales</li>
              <li>Informes personalizados</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardTitle className="flex items-center">
              <BarChart2 className="mr-2" />
              Funcionalidades Principales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p>Gestiona tu actividad con:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Creación y seguimiento de facturas</li>
              <li>Registro de gastos con escaneo</li>
              <li>Dashboard financiero personalizado</li>
              <li>Generación de presupuestos</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      <Separator className="my-8" />
      
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Versión 2025</h2>
        <p className="text-gray-600">
          Utilizando las últimas regulaciones fiscales para autónomos en España
        </p>
      </div>
    </div>
  );
}