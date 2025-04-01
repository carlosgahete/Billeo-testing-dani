import { useAuth } from "@/hooks/use-auth";
import QuoteFormMinimal from "@/components/quotes/QuoteFormMinimal";
import QuoteFormNew from "@/components/quotes/QuoteFormNew";
import { PageTitle } from "@/components/ui/page-title";
import Layout from "@/components/layout/Layout";
import { useLocation } from "wouter";

export default function CreateQuotePage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const isMinimalVersion = location === "/quotes/new/minimal";

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <Layout>
      <PageTitle 
        title="Crear presupuesto" 
        description="Crea un nuevo presupuesto para tus clientes." 
      />
      <div className="my-6">
        {isMinimalVersion ? <QuoteFormMinimal /> : <QuoteFormNew />}
      </div>
    </Layout>
  );
}