import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

// Componente ultra minimalista sin dependencias complejas
export default function UltraMinimalQuoteList() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cargar datos directamente sin usar react-query
  useEffect(() => {
    // Función para cargar datos
    async function loadData() {
      try {
        // Cargar presupuestos
        const quotesRes = await fetch("/api/quotes", {
          credentials: "include"
        });
        
        if (!quotesRes.ok) {
          if (quotesRes.status === 401) {
            setError("Por favor inicia sesión para ver tus presupuestos");
          } else {
            setError("Error cargando presupuestos");
          }
          setLoading(false);
          return;
        }
        
        const quotesData = await quotesRes.json();
        setQuotes(quotesData);
        
        // Cargar clientes
        const clientsRes = await fetch("/api/clients", {
          credentials: "include"
        });
        
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(clientsData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError("Error de conexión");
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Funciones auxiliares
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR"
      }).format(amount);
    } catch {
      return amount + " €";
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case "draft": return "Borrador";
      case "sent": return "Enviado";
      case "accepted": return "Aceptado";
      case "rejected": return "Rechazado";
      case "expired": return "Expirado";
      default: return status;
    }
  };
  
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Cliente desconocido";
  };
  
  // Acciones básicas
  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar este presupuesto?")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (res.ok) {
        // Actualizar la lista local
        setQuotes(quotes.filter(q => q.id !== id));
        alert("Presupuesto eliminado");
      } else {
        alert("Error al eliminar presupuesto");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error de conexión");
    }
  };
  
  const downloadPdf = (id: number) => {
    window.open(`/api/quotes/${id}/pdf`, "_blank");
  };

  // Si está cargando
  if (loading) {
    return (
      <div style={{padding: "20px", textAlign: "center"}}>
        Cargando presupuestos...
      </div>
    );
  }
  
  // Si hay error
  if (error) {
    return (
      <div style={{padding: "20px", textAlign: "center", color: "red"}}>
        {error}
      </div>
    );
  }
  
  // Si no hay presupuestos
  if (quotes.length === 0) {
    return (
      <div style={{padding: "20px", textAlign: "center"}}>
        No tienes presupuestos. 
        <div style={{marginTop: "20px"}}>
          <a href="/quotes/simple/create" 
             style={{
               backgroundColor: "#4f46e5", 
               color: "white", 
               padding: "10px 20px", 
               borderRadius: "5px", 
               textDecoration: "none"
             }}>
            Crear presupuesto
          </a>
        </div>
      </div>
    );
  }

  // Renderizar lista ultra simple
  return (
    <div style={{padding: "15px", paddingBottom: "80px"}}>
      <h1 style={{fontSize: "22px", marginBottom: "15px"}}>Tus Presupuestos</h1>
      
      <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
        {quotes.map((quote) => (
          <div key={quote.id} 
               style={{
                 backgroundColor: "white", 
                 border: "1px solid #e5e7eb", 
                 borderRadius: "8px", 
                 padding: "12px"
               }}>
            <div style={{
              display: "flex", 
              justifyContent: "space-between", 
              marginBottom: "10px"
            }}>
              <div>
                <div style={{fontWeight: "500"}}>{quote.quoteNumber}</div>
                <div style={{fontSize: "14px", color: "#6b7280"}}>
                  {getClientName(quote.clientId)}
                </div>
              </div>
              <div style={{textAlign: "right"}}>
                <div style={{fontWeight: "bold"}}>{formatCurrency(quote.total)}</div>
                <div style={{fontSize: "14px", color: "#6b7280"}}>
                  {getStatusText(quote.status)}
                </div>
              </div>
            </div>
            
            <div style={{
              display: "flex", 
              gap: "8px", 
              marginTop: "10px"
            }}>
              <a href={`/quotes/simple/edit/${quote.id}`} 
                 style={{
                   flex: "1",
                   backgroundColor: "#4f46e5", 
                   color: "white", 
                   padding: "8px 0", 
                   borderRadius: "4px", 
                   textAlign: "center",
                   textDecoration: "none",
                   fontSize: "14px"
                 }}>
                Editar
              </a>
              
              <button 
                onClick={() => handleDelete(quote.id)}
                style={{
                  border: "1px solid #d1d5db", 
                  backgroundColor: "white", 
                  color: "#374151", 
                  padding: "8px 12px", 
                  borderRadius: "4px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}>
                Eliminar
              </button>
              
              <button 
                onClick={() => downloadPdf(quote.id)}
                style={{
                  border: "1px solid #d1d5db", 
                  backgroundColor: "white", 
                  color: "#374151", 
                  padding: "8px 12px", 
                  borderRadius: "4px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}>
                PDF
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Botón flotante */}
      <div style={{
        position: "fixed", 
        bottom: "80px", 
        right: "20px"
      }}>
        <a href="/quotes/simple/create" 
           style={{
             display: "flex", 
             justifyContent: "center", 
             alignItems: "center", 
             width: "56px", 
             height: "56px", 
             backgroundColor: "#4f46e5", 
             color: "white", 
             borderRadius: "28px", 
             textDecoration: "none", 
             fontSize: "24px", 
             boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
           }}>
          +
        </a>
      </div>
    </div>
  );
}