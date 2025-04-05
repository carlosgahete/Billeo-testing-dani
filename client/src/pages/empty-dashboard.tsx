import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import EmptyDashboard from "@/components/dashboard/EmptyDashboard";

const EmptyDashboardPage = () => {
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/session"],
  });

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 mt-4">
        <PageTitle 
          title="Dashboard Personalizable"
          description="Crea tu dashboard desde cero con los widgets que prefieras"
          variant="gradient"
          className="w-full overflow-visible"
        />
      </div>
      
      {/* Dashboard vacío completamente personalizable */}
      <EmptyDashboard userId={user?.user?.id || 0} />
    </div>
  );
};

export default EmptyDashboardPage;