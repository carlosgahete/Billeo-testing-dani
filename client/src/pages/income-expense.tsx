import { ReactNode, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { LayoutDashboard, Receipt, Wallet, BarChart3, Building2, Settings, Bell, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
      <header className="bg-white border-b border-neutral-200 py-3 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <img src={billeoLogo} alt="Billeo Logo" className="h-8 mr-4" />
          <h1 className="text-xl font-semibold text-primary">Ingresos y Gastos</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={user?.profileImage ? user.profileImage : undefined} alt={user?.name || "Usuario"} />
            <AvatarFallback className="text-xs">
              {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : <User size={16} />}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Navegación secundaria */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto space-x-6 py-2 no-scrollbar">
            {navigationItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center py-2 px-3 whitespace-nowrap rounded-md text-sm transition-colors ${
                  location === item.href 
                    ? "bg-primary/10 text-primary" 
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <IncomeExpenseReport />
        </div>
      </main>
    </div>
  );
}