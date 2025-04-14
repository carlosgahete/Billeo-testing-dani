import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Componente completamente libre sin conexión a API ni autenticación
export default function LibroRegistrosPublico() {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  
  // Datos de ejemplo estáticos para mostrar
  const mockData = {
    invoices: [
      {
        id: 1,
        number: "2025-001",
        issueDate: "2025-04-14",
        client: "Cliente Ejemplo",
        baseAmount: 100000,
        vatAmount: 21000,
        total: 121000,
        status: "paid"
      },
      {
        id: 2,
        number: "2025-002",
        issueDate: "2025-04-10",
        client: "Otro Cliente",
        baseAmount: 2500,
        vatAmount: 525,
        total: 3025,
        status: "pending"
      }
    ],
    transactions: [
      {
        id: 101,
        date: "2025-04-03",
        description: "Gastos de oficina",
        category: "Oficina",
        amount: 450,
        type: "expense"
      },
      {
        id: 102,
        date: "2025-04-05",
        description: "Pago de servicios",
        category: "Servicios",
        amount: 125.50,
        type: "expense"
      }
    ],
    summary: {
      totalInvoices: 2,
      totalTransactions: 2,
      totalQuotes: 0,
      incomeTotal: 124025,
      expenseTotal: 575.50
    }
  };

  // Generar PDF con los datos de ejemplo
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Libro de Registros - Ejemplo", 14, 22);
    doc.setFontSize(11);
    doc.text("Año: 2025", 14, 30);
    
    // Resumen
    doc.setFontSize(14);
    doc.text("Resumen", 14, 40);
    
    const summaryData = [
      ['Concepto', 'Cantidad', 'Importe Total'],
      ['Facturas', mockData.summary.totalInvoices.toString(), `${mockData.summary.incomeTotal.toLocaleString('es-ES')} €`],
      ['Gastos', mockData.summary.totalTransactions.toString(), `${mockData.summary.expenseTotal.toLocaleString('es-ES')} €`],
      ['Presupuestos', mockData.summary.totalQuotes.toString(), '']
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'striped',
    });
    
    // Facturas
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Facturas", 14, 20);
    
    const invoiceData = [
      ['Número', 'Fecha', 'Cliente', 'Base', 'IVA', 'Total', 'Estado'],
      ...mockData.invoices.map(inv => [
        inv.number,
        inv.issueDate,
        inv.client,
        `${inv.baseAmount.toLocaleString('es-ES')} €`,
        `${inv.vatAmount.toLocaleString('es-ES')} €`,
        `${inv.total.toLocaleString('es-ES')} €`,
        getStatusText(inv.status)
      ])
    ];
    
    autoTable(doc, {
      startY: 25,
      head: [invoiceData[0]],
      body: invoiceData.slice(1),
      theme: 'striped',
    });
    
    // Gastos
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Gastos", 14, 20);
    
    const transactionData = [
      ['Fecha', 'Descripción', 'Categoría', 'Importe', 'Tipo'],
      ...mockData.transactions.map(tr => [
        tr.date,
        tr.description,
        tr.category,
        `${Math.abs(tr.amount).toLocaleString('es-ES')} €`,
        tr.type === 'income' ? 'Ingreso' : 'Gasto'
      ])
    ];
    
    autoTable(doc, {
      startY: 25,
      head: [transactionData[0]],
      body: transactionData.slice(1),
      theme: 'striped',
    });
    
    doc.save(`libro-registros-ejemplo.pdf`);
  };

  // Generar CSV con los datos de ejemplo
  const generateCSV = () => {
    // Preparar datos para CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Encabezado
    csvContent += "Libro de Registros - Año: 2025\n\n";
    
    // Resumen
    csvContent += "RESUMEN\n";
    csvContent += "Concepto,Cantidad,Importe Total\n";
    csvContent += `Facturas,${mockData.summary.totalInvoices},${mockData.summary.incomeTotal.toLocaleString('es-ES')} €\n`;
    csvContent += `Gastos,${mockData.summary.totalTransactions},${mockData.summary.expenseTotal.toLocaleString('es-ES')} €\n`;
    csvContent += `Presupuestos,${mockData.summary.totalQuotes},\n\n`;
    
    // Facturas
    csvContent += "FACTURAS\n";
    csvContent += "Número,Fecha,Cliente,Base,IVA,Total,Estado\n";
    
    mockData.invoices.forEach(inv => {
      csvContent += `${inv.number},${inv.issueDate},"${inv.client}",${inv.baseAmount.toLocaleString('es-ES')} €,${inv.vatAmount.toLocaleString('es-ES')} €,${inv.total.toLocaleString('es-ES')} €,${getStatusText(inv.status)}\n`;
    });
    
    csvContent += "\n";
    
    // Transacciones
    csvContent += "GASTOS\n";
    csvContent += "Fecha,Descripción,Categoría,Importe,Tipo\n";
    
    mockData.transactions.forEach(tr => {
      csvContent += `${tr.date},"${tr.description}","${tr.category}",${Math.abs(tr.amount).toLocaleString('es-ES')} €,${tr.type === 'income' ? 'Ingreso' : 'Gasto'}\n`;
    });
    
    // Crear enlace de descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `libro-registros-ejemplo.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Funciones auxiliares para mostrar estados
  function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "Pendiente",
      paid: "Pagado",
      overdue: "Vencido",
      draft: "Borrador",
      accepted: "Aceptado",
      rejected: "Rechazado",
      sent: "Enviado"
    };
    
    return statusMap[status] || status;
  }
  
  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h1 className="text-2xl font-bold">Libro de Registros (Acceso Público)</h1>
          
          <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
            <Button 
              variant="default" 
              onClick={generatePDF}
              className="flex items-center gap-2 w-[150px]"
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            
            <Button 
              variant="default" 
              onClick={generateCSV}
              className="flex items-center gap-2 w-[150px]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
        
        {/* Mensaje de bienvenida */}
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-6">
          <h2 className="font-semibold text-lg mb-2">Modo Demo - Libro de Registros</h2>
          <p className="mb-2">
            Esta es una versión de demostración del Libro de Registros con datos de ejemplo.
            En esta vista puedes explorar las funcionalidades básicas sin necesidad de autenticación.
          </p>
          <p>
            Los botones de exportación a PDF y Excel están activos para que puedas probar estas funcionalidades.
          </p>
        </div>
        
        {/* Filtros (simplificados) */}
        <div className="flex mb-6 gap-4 justify-center">
          <Button 
            variant={selectedFilter === "all" ? "default" : "outline"}
            onClick={() => setSelectedFilter("all")}
          >
            Todo
          </Button>
          <Button 
            variant={selectedFilter === "invoices" ? "default" : "outline"}
            onClick={() => setSelectedFilter("invoices")}
          >
            Facturas
          </Button>
          <Button 
            variant={selectedFilter === "expenses" ? "default" : "outline"}
            onClick={() => setSelectedFilter("expenses")}
          >
            Gastos
          </Button>
        </div>
        
        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Facturas emitidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold">{mockData.summary.totalInvoices}</div>
                <div className="text-xl text-right">
                  {mockData.summary.incomeTotal.toLocaleString('es-ES')} €
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Gastos registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold">{mockData.summary.totalTransactions}</div>
                <div className="text-xl text-right">
                  {mockData.summary.expenseTotal.toLocaleString('es-ES')} €
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Presupuestos enviados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockData.summary.totalQuotes}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabla de facturas */}
        {(selectedFilter === "all" || selectedFilter === "invoices") && (
          <div>
            <h2 className="text-xl font-bold mb-4">Facturas</h2>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockData.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.number}</TableCell>
                        <TableCell>{invoice.issueDate}</TableCell>
                        <TableCell>{invoice.client}</TableCell>
                        <TableCell className="text-right">
                          {invoice.baseAmount.toLocaleString('es-ES')} €
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.vatAmount.toLocaleString('es-ES')} €
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.total.toLocaleString('es-ES')} €
                        </TableCell>
                        <TableCell>
                          <span 
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                                  'bg-yellow-100 text-yellow-800'}`}
                          >
                            {getStatusText(invoice.status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
        
        {/* Tabla de gastos */}
        {(selectedFilter === "all" || selectedFilter === "expenses") && (
          <div className="mt-6">
            <h2 className="text-xl font-bold mb-4">Gastos</h2>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockData.transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className="text-right">
                          {Math.abs(transaction.amount).toLocaleString('es-ES')} €
                        </TableCell>
                        <TableCell>
                          <span 
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}