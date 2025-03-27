import { useAuth } from "@/hooks/use-auth";
import { useRoute } from "wouter";
import QuoteForm from "@/components/quotes/QuoteFormNew";
import { PageTitle } from "@/components/ui/page-title";
import Layout from "@/components/layout/Layout";

export default function EditQuotePage() {
  const { user } = useAuth();
  const [, params] = useRoute("/quotes/edit/:id");

  if (!user || !params) {
    return <div>Cargando...</div>;
  }

  const quoteId = parseInt(params.id);

  return (
    <Layout>
      <PageTitle 
        title="Editar presupuesto" 
        description="Modifica los datos de tu presupuesto." 
      />
      <div className="my-6">
        <QuoteForm quoteId={quoteId} />
      </div>
    </Layout>
  );
}