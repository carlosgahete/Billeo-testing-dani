import { useState, useEffect, useRef } from "react";
import IncomeExpenseReport from "@/components/reports/IncomeExpenseReport";
import { PageTitle } from "@/components/ui/page-title";
import Header from "@/components/layout/Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutDashboard, Receipt, Wallet, BarChart3, Building2, Settings } from "lucide-react";
import { useLocation, Link } from "wouter";

// Componente independiente sin el Layout que causa problemas
export default function IncomeExpensePage() {
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Creamos una versión simplificada de los elementos de navegación
  const navigationItems = [
    { href: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { href: "/invoices", icon: <Receipt size={20} />, label: "Facturas" },
    { href: "/transactions", icon: <Wallet size={20} />, label: "Transacciones" },
    { href: "/reports", icon: <BarChart3 size={20} />, label: "Informes" },
    { href: "/company", icon: <Building2 size={20} />, label: "Empresa" },
    { href: "/settings", icon: <Settings size={20} />, label: "Configuración" }
  ];

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      {/* Mobile header */}
      {isMobile && (
        <Header 
          isMobile={true} 
          mobileMenuOpen={mobileMenuOpen} 
          setMobileMenuOpen={setMobileMenuOpen} 
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Navegación alternativa simple */}
        <div className="fixed top-0 left-0 w-full z-10 bg-white shadow-md">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center space-x-4 overflow-x-auto no-scrollbar">
              {navigationItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className={`flex items-center py-2 px-3 rounded-md text-sm whitespace-nowrap ${
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

        {/* Contenido principal - sin sidebar problemático */}
        <main className="flex-1 overflow-y-auto pt-14">
          <div className="p-4 lg:p-6">
            <PageTitle 
              title="Ingresos y Gastos" 
              description="Gestiona tus transacciones financieras"
            />
            <IncomeExpenseReport />
          </div>
        </main>
      </div>
    </div>
  );
}