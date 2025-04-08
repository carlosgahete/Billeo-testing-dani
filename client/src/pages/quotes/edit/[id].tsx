import { useAuth } from "@/hooks/use-auth";
import { useRoute } from "wouter";
import QuoteFormApple from "@/components/quotes/QuoteFormApple";
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
      <div className="my-6">
        <QuoteFormApple quoteId={quoteId} />
      </div>
    </Layout>
  );
}