import SimpleExpenseForm from '@/components/transactions/SimpleExpenseForm';

export default function SimpleExpensePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Registrar nuevo gasto</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <SimpleExpenseForm />
      </div>
    </div>
  );
}