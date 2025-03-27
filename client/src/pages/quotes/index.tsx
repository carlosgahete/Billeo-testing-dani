import { useAuth } from "@/hooks/use-auth";
import { QuoteList } from "@/components/quotes/QuoteList";
import { PageTitle } from "@/components/ui/page-title";
import Layout from "@/components/layout/Layout";

export default function QuotesPage() {
  const { user } = useAuth();

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <Layout>
      <PageTitle 
        title="Presupuestos" 
        description="Gestiona tus presupuestos, envíalos a clientes y conviértelos en facturas." 
      />
      <div className="mt-6">
        <QuoteList userId={user.id} showActions={true} />
      </div>
    </Layout>
  );
}