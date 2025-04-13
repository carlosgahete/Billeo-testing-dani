import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { MinimalQuoteList } from "@/components/quotes/MinimalQuoteList";

export default function SimpleQuoteListPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-center">Cargando...</p>
      </div>
    );
  }

  return <MinimalQuoteList userId={user.id} />;
}