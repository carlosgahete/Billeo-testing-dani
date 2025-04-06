import React from 'react';
import CompleteDashboard from '@/components/dashboard/CompleteDashboard';
import { PageTitle } from '@/components/ui/page-title';

const CompleteDashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <PageTitle
        title="Dashboard Financiero"
        description="Control completo de tus finanzas"
        variant="gradient"
      />
      <CompleteDashboard className="mt-6" />
    </div>
  );
};

export default CompleteDashboardPage;