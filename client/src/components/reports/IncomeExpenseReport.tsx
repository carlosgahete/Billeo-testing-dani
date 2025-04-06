import { useState } from "react";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExpenseFilters } from "./ExpenseFilters";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search as MagnifyingGlassIcon, Eye as LucideEye, Download as LucideDownload, Trash as LucideTrash, Printer as LucidePrinter, Edit as LucideEdit, CreditCard as LucideCreditCard, Receipt as LucideReceipt, FileText as LucideFileText, Clipboard as LucideClipboard } from "lucide-react";
import { Popover as PopoverTooltip } from "@/components/ui/popover";
import { PopoverTrigger as PopoverTooltipTrigger } from "@/components/ui/popover";
import { PopoverContent as PopoverTooltipContent } from "@/components/ui/popover";

// Definición de interfaces
interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
}

interface Client {
  id: number;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  categoryId: number | null;
  paymentMethod?: string;
  attachments?: string[];
  tax?: number | string;
  notes?: string;
}

interface Category {
  id: number;
  name: string;
  type?: "income" | "expense";
  color?: string;
  icon?: string;
}

// Esquema de validación
const categorySchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  type: z.enum(["income", "expense"]),
  color: z.string().optional(),
  icon: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const IncomeExpenseReport = () => {
  // Estados para filtros
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });
  const [priceRange, setPriceRange] = useState<{
    min: string;
    max: string;
  }>({
    min: "",
    max: "",
  });
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  
  // Estado para mostrar detalles de transacción
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isViewingTransaction, setIsViewingTransaction] = useState(false);
  
  // Estado para la vista ampliada de imágenes
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isViewingImage, setIsViewingImage] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  
  // Consulta de datos
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 3000, // Actualización automática cada 3 segundos
  });
  
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    refetchInterval: 3000,
  });
  
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    refetchInterval: 3000,
  });
  
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Mutación para eliminar transacción
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Error al eliminar la transacción");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error: Error) => {
      console.error("Error al eliminar la transacción:", error);
      alert("No se pudo eliminar la transacción. " + error.message);
    },
  });
  
  // Mutación para eliminar factura
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Error al eliminar la factura");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error: Error) => {
      console.error("Error al eliminar la factura:", error);
      alert("No se pudo eliminar la factura. " + error.message);
    },
  });
  
  // Función para filtrar transacciones
  const getFilteredTransactions = () => {
    if (!isFilterApplied) return transactions;
    
    return transactions.filter((transaction: Transaction) => {
      // Filtro por categoría
      if (
        selectedCategories.length > 0 &&
        (!transaction.categoryId ||
          !selectedCategories.includes(transaction.categoryId))
      ) {
        return false;
      }
      
      // Filtro por fecha
      if (dateRange.start && new Date(transaction.date) < dateRange.start) {
        return false;
      }
      
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(transaction.date) > endDate) {
          return false;
        }
      }
      
      // Filtro por precio
      if (
        priceRange.min &&
        parseFloat(priceRange.min) > parseFloat(transaction.amount.toString())
      ) {
        return false;
      }
      
      if (
        priceRange.max &&
        parseFloat(priceRange.max) < parseFloat(transaction.amount.toString())
      ) {
        return false;
      }
      
      return true;
    });
  };
  
  // Función para aplicar filtros
  const handleApplyFilters = () => {
    setIsFilterApplied(true);
  };
  
  // Función para limpiar filtros
  const handleClearFilters = () => {
    setSelectedCategories([]);
    setDateRange({ start: null, end: null });
    setPriceRange({ min: "", max: "" });
    setIsFilterApplied(false);
  };
  
  // Función para confirmar eliminación
  const confirmDeleteTransaction = (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta transacción?")) {
      deleteTransactionMutation.mutate(id);
    }
  };
  
  const confirmDeleteInvoice = (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta factura?")) {
      deleteInvoiceMutation.mutate(id);
    }
  };
  
  // Función para manejar el movimiento del magnificador
  const handleImageMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isMagnifierActive) return;
    
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setMagnifierPosition({ x, y });
  };
  
  // Exportación a PDF para transacciones
  const handleExportTransactionsPDF = () => {
    try {
      const doc = new jsPDF();
      
      const filteredTransactions = getFilteredTransactions();
      
      // Título
      doc.setFontSize(18);
      doc.text("Informe de Transacciones", 14, 22);
      
      // Fecha de generación
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(
        `Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        14,
        30
      );
      
      // Info de filtros
      if (isFilterApplied) {
        let filterText = "Filtros aplicados: ";
        const filterParts = [];
        
        if (selectedCategories.length > 0) {
          const categoryNames = selectedCategories
            .map(
              (id) =>
                categories.find((cat: Category) => cat.id === id)?.name || ""
            )
            .join(", ");
          filterParts.push(`Categorías: ${categoryNames}`);
        }
        
        if (dateRange.start) {
          filterParts.push(
            `Desde: ${format(dateRange.start, "dd/MM/yyyy")}`
          );
        }
        
        if (dateRange.end) {
          filterParts.push(`Hasta: ${format(dateRange.end, "dd/MM/yyyy")}`);
        }
        
        if (priceRange.min) {
          filterParts.push(`Importe mínimo: ${priceRange.min}€`);
        }
        
        if (priceRange.max) {
          filterParts.push(`Importe máximo: ${priceRange.max}€`);
        }
        
        if (filterParts.length > 0) {
          filterText += filterParts.join(", ");
          doc.setFontSize(10);
          doc.text(filterText, 14, 38);
        }
      }
      
      // Tabla de transacciones
      const tableColumn = [
        "Fecha",
        "Descripción",
        "Categoría",
        "Importe",
        "Tipo",
      ];
      const tableRows: any[] = [];
      
      filteredTransactions.forEach((transaction: Transaction) => {
        const category =
          categories.find(
            (cat: Category) => cat.id === transaction.categoryId
          )?.name || "Sin categoría";
        
        const transactionData = [
          format(new Date(transaction.date), "dd/MM/yyyy"),
          transaction.description,
          category,
          `${transaction.amount.toFixed(2)} €`,
          transaction.type === "income" ? "Ingreso" : "Gasto",
        ];
        tableRows.push(transactionData);
      });
      
      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [220, 53, 69] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });
      
      // Cálculos de totales
      let totalIncome = 0;
      let totalExpense = 0;
      
      filteredTransactions.forEach((transaction: Transaction) => {
        if (transaction.type === "income") {
          totalIncome += transaction.amount;
        } else {
          totalExpense += transaction.amount;
        }
      });
      
      // Resumen financiero
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Resumen Financiero:", 14, finalY + 15);
      
      doc.setFontSize(11);
      doc.text(`Total Ingresos: ${totalIncome.toFixed(2)} €`, 14, finalY + 25);
      doc.text(`Total Gastos: ${totalExpense.toFixed(2)} €`, 14, finalY + 35);
      doc.text(
        `Balance: ${(totalIncome - totalExpense).toFixed(2)} €`,
        14,
        finalY + 45
      );
      
      // Guardar el PDF
      doc.save("informe-transacciones.pdf");
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      alert("Error al generar el PDF: " + (error as Error).message);
    }
  };
  
  // Exportación a PDF para facturas
  const handleExportInvoicePDF = async (invoice: Invoice) => {
    try {
      const doc = new jsPDF();
      
      // Buscar el cliente de la factura
      const client = clients.find((c: Client) => c.id === invoice.clientId);
      
      // Título
      doc.setFontSize(20);
      doc.text("FACTURA", 105, 20, { align: "center" });
      
      // Número de factura
      doc.setFontSize(16);
      doc.text(`Nº: ${invoice.invoiceNumber}`, 105, 30, { align: "center" });
      
      // Información de la empresa
      doc.setFontSize(10);
      doc.text("DATOS DEL EMISOR:", 14, 45);
      doc.text("Tu Empresa, S.L.", 14, 52);
      doc.text("NIF: B12345678", 14, 58);
      doc.text("Calle Ejemplo, 123", 14, 64);
      doc.text("28001 Madrid, España", 14, 70);
      
      // Información del cliente
      doc.text("DATOS DEL CLIENTE:", 120, 45);
      if (client) {
        doc.text(client.name, 120, 52);
        doc.text(`NIF/CIF: ${client.taxId}`, 120, 58);
        doc.text(client.address, 120, 64);
        doc.text(`${client.postalCode} ${client.city}, ${client.country}`, 120, 70);
      } else {
        doc.text("Cliente no encontrado", 120, 52);
      }
      
      // Fechas
      doc.text(`Fecha de emisión: ${format(new Date(invoice.issueDate), "dd/MM/yyyy")}`, 14, 85);
      doc.text(`Fecha de vencimiento: ${format(new Date(invoice.dueDate), "dd/MM/yyyy")}`, 120, 85);
      
      // Tabla de detalles
      const tableColumn = ["Concepto", "Base Imponible", "IVA (21%)", "Total"];
      const tableRows = [
        [
          "Servicios prestados según contrato",
          `${invoice.subtotal.toFixed(2)} €`,
          `${invoice.tax.toFixed(2)} €`,
          `${invoice.total.toFixed(2)} €`,
        ],
      ];
      
      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 95,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [220, 53, 69] },
      });
      
      // Totales
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      
      doc.setFontSize(11);
      doc.text("Resumen:", 130, finalY + 15);
      doc.text(`Base Imponible: ${invoice.subtotal.toFixed(2)} €`, 130, finalY + 25);
      doc.text(`IVA (21%): ${invoice.tax.toFixed(2)} €`, 130, finalY + 35);
      doc.text(`Total Factura: ${invoice.total.toFixed(2)} €`, 130, finalY + 45);
      
      // Información bancaria
      doc.setFontSize(10);
      doc.text("DATOS BANCARIOS:", 14, finalY + 65);
      doc.text("IBAN: ES00 0000 0000 0000 0000 0000", 14, finalY + 75);
      doc.text("Entidad: Banco Ejemplo", 14, finalY + 85);
      
      // Forma de pago
      doc.text(`Método de pago: Transferencia bancaria`, 14, finalY + 100);
      
      // Notas legales
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        "Esta factura se ha emitido conforme a lo dispuesto en el Real Decreto 1619/2012, de 30 de noviembre, por el que se aprueba el Reglamento por el que se regulan las obligaciones de facturación.",
        105,
        finalY + 120,
        { align: "center", maxWidth: 170 }
      );
      
      // Guardar el PDF
      doc.save(`factura-${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error("Error al generar el PDF de la factura:", error);
      alert("Error al generar el PDF: " + (error as Error).message);
    }
  };
  
  // Funciones auxiliares para renderizar información
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Sin categoría";
    const category = categories.find((cat: Category) => cat.id === categoryId);
    return category ? category.name : "Sin categoría";
  };
  
  const getCategoryIcon = (categoryId: number | null) => {
    if (!categoryId) return "📁";
    const category = categories.find((cat: Category) => cat.id === categoryId);
    return category?.icon || "📁";
  };
  
  const getCategoryColor = (categoryId: number | null) => {
    if (!categoryId) return "#999";
    const category = categories.find((cat: Category) => cat.id === categoryId);
    return category?.color || "#999";
  };
  
  const getClientName = (clientId: number) => {
    const client = clients.find((c: Client) => c.id === clientId);
    return client ? client.name : "Cliente desconocido";
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "pagada":
        return "bg-green-100 text-green-800";
      case "vencida":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Filtros específicos para ingresos y gastos
  const getIncomeTransactions = () => {
    return transactions.filter((t: Transaction) => t.type === "income");
  };
  
  const getExpenseTransactions = () => {
    return getFilteredTransactions().filter((t: Transaction) => t.type === "expense");
  };
  
  // Renderizado principal
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex">
        {/* Panel lateral para filtros */}
        <div className="hidden md:block">
          <ExpenseFilters
            categories={categories}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            dateRange={dateRange}
            setDateRange={setDateRange}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
        </div>
        
        {/* Contenido principal */}
        <div className="flex-1 ml-0 md:ml-4">
          <Tabs defaultValue="expenses">
            <TabsList className="mb-4">
              <TabsTrigger value="expenses">Gastos</TabsTrigger>
              <TabsTrigger value="incomes">Ingresos</TabsTrigger>
              <TabsTrigger value="invoices">Facturas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="expenses">
              <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 border-b border-gray-200">
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    <span className="text-red-600 mr-1">💸</span> Gastos
                  </CardTitle>
                  
                  <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={handleExportTransactionsPDF}
                    >
                      <LucideDownload className="h-3.5 w-3.5 mr-1" />
                      Exportar PDF
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs md:hidden"
                      onClick={() => {
                        const filtersContainer = document.getElementById('mobile-filters');
                        if (filtersContainer) {
                          filtersContainer.classList.toggle('hidden');
                        }
                      }}
                    >
                      Filtros
                    </Button>
                  </div>
                </CardHeader>
                
                {/* Filtros móviles (ocultos por defecto) */}
                <div id="mobile-filters" className="md:hidden hidden p-4 bg-gray-50 border-b border-gray-200">
                  <ExpenseFilters
                    categories={categories}
                    selectedCategories={selectedCategories}
                    setSelectedCategories={setSelectedCategories}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    onApplyFilters={handleApplyFilters}
                    onClearFilters={handleClearFilters}
                  />
                </div>
                
                <CardContent className="p-0">
                  {isLoadingTransactions ? (
                    <div className="p-8 text-center">Cargando gastos...</div>
                  ) : getExpenseTransactions().length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {isFilterApplied
                        ? "No se encontraron gastos con los filtros aplicados"
                        : "No hay gastos registrados"}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Importe (€)</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getExpenseTransactions().map((transaction: Transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">
                                {format(new Date(transaction.date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <span
                                    className="mr-2"
                                    style={{ color: getCategoryColor(transaction.categoryId) }}
                                  >
                                    {getCategoryIcon(transaction.categoryId)}
                                  </span>
                                  {getCategoryName(transaction.categoryId)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <span className="truncate max-w-[180px]">
                                    {transaction.description}
                                  </span>
                                  
                                  {/* Indicadores */}
                                  <div className="flex ml-2 space-x-1">
                                    {transaction.paymentMethod && (
                                      <PopoverTooltip>
                                        <PopoverTooltipTrigger>
                                          <LucideCreditCard className="h-3.5 w-3.5 text-gray-400" />
                                        </PopoverTooltipTrigger>
                                        <PopoverTooltipContent>
                                          <p className="text-xs">
                                            Método de pago: {transaction.paymentMethod}
                                          </p>
                                        </PopoverTooltipContent>
                                      </PopoverTooltip>
                                    )}
                                    
                                    {transaction.tax && (
                                      <PopoverTooltip>
                                        <PopoverTooltipTrigger>
                                          <LucideReceipt className="h-3.5 w-3.5 text-gray-400" />
                                        </PopoverTooltipTrigger>
                                        <PopoverTooltipContent>
                                          <p className="text-xs">
                                            IVA: {transaction.tax}%
                                          </p>
                                        </PopoverTooltipContent>
                                      </PopoverTooltip>
                                    )}
                                    
                                    {transaction.attachments &&
                                      transaction.attachments.length > 0 && (
                                        <PopoverTooltip>
                                          <PopoverTooltipTrigger>
                                            <LucideFileText className="h-3.5 w-3.5 text-gray-400" />
                                          </PopoverTooltipTrigger>
                                          <PopoverTooltipContent>
                                            <p className="text-xs">
                                              {transaction.attachments.length}{" "}
                                              {transaction.attachments.length === 1
                                                ? "adjunto"
                                                : "adjuntos"}
                                            </p>
                                          </PopoverTooltipContent>
                                        </PopoverTooltip>
                                      )}
                                    
                                    {transaction.notes && (
                                      <PopoverTooltip>
                                        <PopoverTooltipTrigger>
                                          <LucideClipboard className="h-3.5 w-3.5 text-gray-400" />
                                        </PopoverTooltipTrigger>
                                        <PopoverTooltipContent>
                                          <p className="text-xs">
                                            Notas: {transaction.notes}
                                          </p>
                                        </PopoverTooltipContent>
                                      </PopoverTooltip>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {transaction.amount.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setSelectedTransaction(transaction);
                                      setIsViewingTransaction(true);
                                    }}
                                  >
                                    <LucideEye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      window.location.href = `/transactions/edit/${transaction.id}`;
                                    }}
                                  >
                                    <LucideEdit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-600"
                                    onClick={() => confirmDeleteTransaction(transaction.id)}
                                  >
                                    <LucideTrash className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="incomes">
              <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 border-b border-gray-200">
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    <span className="text-green-600 mr-1">💰</span> Ingresos
                  </CardTitle>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs mt-2 md:mt-0"
                    onClick={handleExportTransactionsPDF}
                  >
                    <LucideDownload className="h-3.5 w-3.5 mr-1" />
                    Exportar PDF
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingTransactions ? (
                    <div className="p-8 text-center">Cargando ingresos...</div>
                  ) : getIncomeTransactions().length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No hay ingresos registrados
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Importe (€)</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getIncomeTransactions().map((transaction: Transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">
                                {format(new Date(transaction.date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <span
                                    className="mr-2"
                                    style={{ color: getCategoryColor(transaction.categoryId) }}
                                  >
                                    {getCategoryIcon(transaction.categoryId)}
                                  </span>
                                  {getCategoryName(transaction.categoryId)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <span className="truncate max-w-[180px]">
                                    {transaction.description}
                                  </span>
                                  
                                  {/* Indicadores */}
                                  <div className="flex ml-2 space-x-1">
                                    {transaction.paymentMethod && (
                                      <PopoverTooltip>
                                        <PopoverTooltipTrigger>
                                          <LucideCreditCard className="h-3.5 w-3.5 text-gray-400" />
                                        </PopoverTooltipTrigger>
                                        <PopoverTooltipContent>
                                          <p className="text-xs">
                                            Método de pago: {transaction.paymentMethod}
                                          </p>
                                        </PopoverTooltipContent>
                                      </PopoverTooltip>
                                    )}
                                    
                                    {transaction.tax && (
                                      <PopoverTooltip>
                                        <PopoverTooltipTrigger>
                                          <LucideReceipt className="h-3.5 w-3.5 text-gray-400" />
                                        </PopoverTooltipTrigger>
                                        <PopoverTooltipContent>
                                          <p className="text-xs">
                                            IVA: {transaction.tax}%
                                          </p>
                                        </PopoverTooltipContent>
                                      </PopoverTooltip>
                                    )}
                                    
                                    {transaction.attachments &&
                                      transaction.attachments.length > 0 && (
                                        <PopoverTooltip>
                                          <PopoverTooltipTrigger>
                                            <LucideFileText className="h-3.5 w-3.5 text-gray-400" />
                                          </PopoverTooltipTrigger>
                                          <PopoverTooltipContent>
                                            <p className="text-xs">
                                              {transaction.attachments.length}{" "}
                                              {transaction.attachments.length === 1
                                                ? "adjunto"
                                                : "adjuntos"}
                                            </p>
                                          </PopoverTooltipContent>
                                        </PopoverTooltip>
                                      )}
                                    
                                    {transaction.notes && (
                                      <PopoverTooltip>
                                        <PopoverTooltipTrigger>
                                          <LucideClipboard className="h-3.5 w-3.5 text-gray-400" />
                                        </PopoverTooltipTrigger>
                                        <PopoverTooltipContent>
                                          <p className="text-xs">
                                            Notas: {transaction.notes}
                                          </p>
                                        </PopoverTooltipContent>
                                      </PopoverTooltip>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {transaction.amount.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setSelectedTransaction(transaction);
                                      setIsViewingTransaction(true);
                                    }}
                                  >
                                    <LucideEye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      window.location.href = `/transactions/edit/${transaction.id}`;
                                    }}
                                  >
                                    <LucideEdit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-600"
                                    onClick={() => confirmDeleteTransaction(transaction.id)}
                                  >
                                    <LucideTrash className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="invoices">
              <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 border-b border-gray-200">
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    <span className="text-blue-600 mr-1">📄</span> Facturas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingInvoices || isLoadingClients ? (
                    <div className="p-8 text-center">Cargando facturas...</div>
                  ) : invoices.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No hay facturas registradas
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha emisión</TableHead>
                            <TableHead>Vencimiento</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Total (€)</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice: Invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium">
                                {invoice.invoiceNumber}
                              </TableCell>
                              <TableCell>
                                {getClientName(invoice.clientId)}
                              </TableCell>
                              <TableCell>
                                {format(new Date(invoice.issueDate), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                {format(new Date(invoice.dueDate), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getStatusColor(invoice.status)}
                                  variant="outline"
                                >
                                  {invoice.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {invoice.total.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      window.location.href = `/invoices/${invoice.id}`;
                                    }}
                                  >
                                    <LucideEye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleExportInvoicePDF(invoice)}
                                  >
                                    <LucidePrinter className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      window.location.href = `/invoices/edit/${invoice.id}`;
                                    }}
                                  >
                                    <LucideEdit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-600"
                                    onClick={() => confirmDeleteInvoice(invoice.id)}
                                  >
                                    <LucideTrash className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Diálogo para ver detalles de transacción */}
      <Dialog
        open={isViewingTransaction}
        onOpenChange={(open) => {
          if (!open) setIsViewingTransaction(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la transacción</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Tipo
                  </label>
                  <p className="text-sm font-medium">
                    {selectedTransaction.type === "income"
                      ? "Ingreso"
                      : "Gasto"}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Fecha
                  </label>
                  <p className="text-sm font-medium">
                    {format(
                      new Date(selectedTransaction.date),
                      "dd MMMM yyyy",
                      { locale: es }
                    )}
                  </p>
                </div>
                
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">
                    Descripción
                  </label>
                  <p className="text-sm">
                    {selectedTransaction.description}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Categoría
                  </label>
                  <div className="flex items-center">
                    <span
                      className="mr-1"
                      style={{
                        color: getCategoryColor(
                          selectedTransaction.categoryId
                        ),
                      }}
                    >
                      {getCategoryIcon(selectedTransaction.categoryId)}
                    </span>
                    <p className="text-sm">
                      {getCategoryName(selectedTransaction.categoryId)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Importe
                  </label>
                  <p className="text-sm font-medium">
                    {selectedTransaction.amount.toFixed(2)} €
                  </p>
                </div>
                
                {selectedTransaction.paymentMethod && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Método de pago
                    </label>
                    <p className="text-sm">
                      {selectedTransaction.paymentMethod}
                    </p>
                  </div>
                )}
                
                {selectedTransaction.tax && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      IVA
                    </label>
                    <p className="text-sm">{selectedTransaction.tax}%</p>
                  </div>
                )}
                
                {selectedTransaction.notes && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500">
                      Notas
                    </label>
                    <p className="text-sm">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>
              
              {selectedTransaction.attachments &&
                selectedTransaction.attachments.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-2">
                      Adjuntos ({selectedTransaction.attachments.length})
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedTransaction.attachments.map(
                        (attachment, index) => (
                          <div
                            key={index}
                            className="relative border rounded-md overflow-hidden h-24 cursor-pointer"
                            onClick={() => {
                              setSelectedImage(attachment);
                              setIsViewingImage(true);
                            }}
                          >
                            <img
                              src={`/uploads/${attachment}`}
                              alt={`Adjunto ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewingTransaction(false)}
            >
              Cerrar
            </Button>
            
            {selectedTransaction && (
              <Button
                onClick={() => {
                  window.location.href = `/transactions/edit/${selectedTransaction.id}`;
                }}
              >
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para ver imagen ampliada */}
      <Dialog
        open={isViewingImage}
        onOpenChange={(open) => {
          if (!open) {
            setIsViewingImage(false);
            setIsMagnifierActive(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Documento adjunto</DialogTitle>
            <DialogDescription>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setIsMagnifierActive(!isMagnifierActive)}
              >
                <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
                {isMagnifierActive ? "Desactivar lupa" : "Activar lupa"}
              </Button>
            </DialogDescription>
          </DialogHeader>
          
          {selectedImage && (
            <div className="relative overflow-hidden">
              <img
                src={`/uploads/${selectedImage}`}
                alt="Documento ampliado"
                className="w-full h-auto object-contain max-h-[60vh]"
                onMouseMove={handleImageMouseMove}
              />
              
              {isMagnifierActive && (
                <div
                  className="absolute pointer-events-none border-2 border-blue-500 w-36 h-36 rounded-full overflow-hidden shadow-lg"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundImage: `url(/uploads/${selectedImage})`,
                    backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
                    backgroundSize: "400%",
                    backgroundRepeat: "no-repeat",
                    zIndex: 10,
                  }}
                >
                  {/* Crosshair */}
                  <div
                    className="absolute"
                    style={{
                      top: "50%",
                      left: 0,
                      width: "100%",
                      height: "1px",
                      backgroundColor: "rgba(255, 0, 0, 0.5)",
                    }}
                  ></div>
                  <div
                    className="absolute"
                    style={{
                      left: "50%",
                      top: 0,
                      height: "100%",
                      width: "1px",
                      backgroundColor: "rgba(255, 0, 0, 0.5)",
                    }}
                  ></div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewingImage(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncomeExpenseReport;