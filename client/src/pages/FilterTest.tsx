import React from 'react';
import Layout from '@/components/layout/Layout';
import SimpleDashboard from '@/components/dashboard/SimpleDashboard';

const FilterTestPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Prueba de Filtros</h1>
        <p className="mb-6 text-gray-600">Esta página es para probar el funcionamiento de los filtros del dashboard.</p>
        
        <SimpleDashboard />
      </div>
    </Layout>
  );
};

export default FilterTestPage;