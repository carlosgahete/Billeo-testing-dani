import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface DownloadTransactionButtonProps {
  transactionId: number;
}

interface Transaction {
  id: number;
  description: string;
  amount: number | string;
  date: string;
  type: 'income' | 'expense';
  categoryId: number | null;
  paymentMethod: string;
  notes?: string;
  attachments?: string[];
  categoryName?: string;
}

const DownloadTransactionButton = ({ transactionId }: DownloadTransactionButtonProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Obtener datos de la transacción
  const { data: transaction, isLoading } = useQuery<Transaction>({
    queryKey: [`/api/transactions/${transactionId}`],
  });

  // Función para generar y descargar el PDF del gasto
  const downloadTransactionPDF = async () => {
    if (!transaction || isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      // Crear un nuevo documento PDF en formato A4
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      // Configurar la información del documento
      const formattedDate = transaction.date 
        ? format(new Date(transaction.date), "dd/MM/yyyy")
        : format(new Date(), "dd/MM/yyyy");
      
      const title = `Comprobante de ${transaction.type === "income" ? "Ingreso" : "Gasto"}`;
      const fileName = `${transaction.type === "income" ? "ingreso" : "gasto"}_${transaction.id}_${formattedDate.replace(/\//g, "-")}.pdf`;
      
      // Añadir título
      doc.setFontSize(20);
      doc.setTextColor(40, 99, 235); // Azul principal
      doc.text(title, 105, 20, { align: "center" });
      
      // Añadir fecha y número de referencia
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha: ${formattedDate}`, 20, 30);
      doc.text(`Ref: #${transaction.id}`, 20, 35);
      
      // Añadir información básica
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Tabla con los detalles del gasto
      autoTable(doc, {
        startY: 45,
        head: [["Concepto", "Detalles"]],
        body: [
          ["Descripción", transaction.description],
          ["Importe", `${transaction.amount} €`],
          ["Tipo", transaction.type === "income" ? "Ingreso" : "Gasto"],
          ["Método de pago", getPaymentMethodText(transaction.paymentMethod)],
          ["Categoría", transaction.categoryName || "Sin categoría"],
          ["Notas", transaction.notes || "---"]
        ],
        theme: "grid",
        headStyles: { fillColor: [40, 99, 235], textColor: [255, 255, 255] },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 40 },
          1: { cellWidth: "auto" }
        },
      });
      
      // Si hay adjuntos, listarlos
      if (transaction.attachments && transaction.attachments.length > 0) {
        const y = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFontSize(12);
        doc.setTextColor(40, 99, 235);
        doc.text("Archivos adjuntos:", 20, y);
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        
        transaction.attachments.forEach((attachment, index) => {
          const fileName = attachment.split('/').pop() || attachment;
          doc.text(`- ${fileName}`, 25, y + 7 + (index * 5));
        });
      }
      
      // Pie de página
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Generado por Billeo - ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }
      
      // Descargar el PDF
      doc.save(fileName);
      
      toast({
        title: "PDF generado correctamente",
        description: `El archivo ${fileName} se ha descargado`,
      });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el PDF. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Función auxiliar para obtener el texto del método de pago
  const getPaymentMethodText = (method: string): string => {
    const methods: Record<string, string> = {
      "cash": "Efectivo",
      "bank_transfer": "Transferencia bancaria",
      "credit_card": "Tarjeta de crédito",
      "debit_card": "Tarjeta de débito",
      "paypal": "PayPal",
      "other": "Otro",
    };
    
    return methods[method] || method;
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={downloadTransactionPDF}
      className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-700"
      disabled={isLoading || isGenerating}
      title="Descargar como PDF"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
};

export default DownloadTransactionButton;