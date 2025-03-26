import { ReactNode, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { LayoutDashboard, Receipt, Wallet, BarChart3, Building2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
// Usar el archivo existente en assets
import billeoLogo from '../assets/billeo-logo.png';
import { PageTitle } from "@/components/ui/page-title";
import IncomeExpenseReport from "@/components/reports/IncomeExpenseReport";
import { Link } from "wouter";

// Componente especial para esta página problemática
export default function IncomeExpensePage() {
  const isMobile = useIsMobile();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  
  // Navegación
  const navigationItems = [
    { href: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { href: "/invoices", icon: <Receipt size={20} />, label: "Facturas" },
    { href: "/transactions", icon: <Wallet size={20} />, label: "Transacciones" },
    { href: "/reports", icon: <BarChart3 size={20} />, label: "Informes" },
    { href: "/company", icon: <Building2 size={20} />, label: "Empresa" },
    { href: "/settings", icon: <Settings size={20} />, label: "Configuración" }
  ];
  
  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      {/* Header */}
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-none mx-auto px-4 lg:px-6 py-4">
          <IncomeExpenseReport />
        </div>
      </main>
    </div>
  );
}