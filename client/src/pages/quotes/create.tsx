import { useAuth } from "@/hooks/use-auth";
import QuoteForm from "@/components/quotes/QuoteFormNew";
import { PageTitle } from "@/components/ui/page-title";
import Layout from "@/components/layout/Layout";

export default function CreateQuotePage() {
  const { user } = useAuth();

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
        <QuoteForm />
      </div>
    </Layout>
  );
}