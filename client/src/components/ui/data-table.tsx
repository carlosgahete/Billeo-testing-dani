import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  FilterFn,
  getFilteredRowModel,
  RowSelectionState,
  OnChangeFn
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Filter, Trash2, FileDown, Check, ChevronDown, ArrowUp, ArrowDown, Calendar, Clock, Pencil } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  pagination?: boolean;
  filterButton?: React.ReactNode;
  showSearch?: boolean;
  actionButtons?: React.ReactNode; // Botones de acción habituales
  selectable?: boolean; // Habilitar selección múltiple
  onRowSelectionChange?: (selectedRows: TData[]) => void; // Callback cuando cambia la selección
  onDeleteSelected?: (selectedRows: TData[]) => void; // Callback para eliminar seleccionados
  onExportSelected?: (selectedRows: TData[]) => void; // Callback para exportar seleccionados
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onSearch,
  searchPlaceholder = "Buscar...",
  pagination = true,
  filterButton,
  showSearch = true,
  actionButtons,
  selectable = false,
  onRowSelectionChange,
  onDeleteSelected,
  onExportSelected
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Preparar columnas con checkbox de selección si es necesario
  const allColumns = selectable 
    ? [
        {
          id: 'select',
          header: ({ table }: any) => (
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center h-5 w-5">
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                  }
                  onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                  aria-label="Seleccionar todo"
                  className="rounded-full h-[18px] w-[18px] border-[1.5px] border-gray-300 
                            data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF]"
                />
              </div>
            </div>
          ),
          cell: ({ row }: any) => (
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center h-5 w-5">
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Seleccionar fila"
                  className="rounded-full h-[18px] w-[18px] border-[1.5px] border-gray-300 
                            data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF]"
                />
              </div>
            </div>
          ),
          enableSorting: false,
          enableHiding: false,
        } as ColumnDef<TData, any>,
        ...columns
      ]
    : columns;
  
  // Referencia para almacenar la tabla
  const tableRef = useRef<any>(null);
  
  // Controlar cambios en la selección
  const handleRowSelectionChange = (updaterOrValue: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
    // Actualizamos el estado de selección
    setRowSelection(updaterOrValue);
    
    // Notificamos al componente padre del cambio después de que se aplique la actualización
    if (onRowSelectionChange) {
      // Usamos setTimeout para asegurar que rowSelection se haya actualizado
      setTimeout(() => {
        if (tableRef.current) {
          const selectedRows = tableRef.current.getFilteredSelectedRowModel().rows.map(
            (row: any) => row.original
          );
          onRowSelectionChange(selectedRows);
        }
      }, 0);
    }
  };

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: handleRowSelectionChange,
    enableRowSelection: true, // Forzamos que siempre sea true para habilitar la selección
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
  });
  
  // Asignar la tabla a la referencia
  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  // Implementación sencilla pero efectiva de búsqueda
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Actualizar el estado local siempre
    setGlobalFilter(value);
    
    // Usar un timeout para no llamar constantemente al callback en cada keystroke
    if (typeof window !== "undefined") {
      window.clearTimeout((window as any).searchTimeout);
      (window as any).searchTimeout = window.setTimeout(() => {
        console.log(`DataTable: Enviando búsqueda: "${value}"`);
        
        // Llamar al callback del componente padre si existe
        if (onSearch) {
          onSearch(value);
        }
      }, 300); // 300ms debería ser suficiente para evitar demasiadas llamadas
    }
  };

  // Número de filas seleccionadas
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;
  
  // Log para depuración
  useEffect(() => {
    if (selectedRowCount > 0) {
      console.log(`DataTable: ${selectedRowCount} filas seleccionadas`);
      console.log("Selectable:", selectable);
      console.log("onExportSelected:", !!onExportSelected);
      console.log("onDeleteSelected:", !!onDeleteSelected);
    }
  }, [selectedRowCount]);
  
  // Obtenemos las filas seleccionadas para acciones en lote
  const getSelectedRows = () => {
    return table.getFilteredSelectedRowModel().rows.map(row => row.original);
  };
  
  // Manejadores para las acciones en lote
  const handleDeleteSelected = () => {
    if (onDeleteSelected) {
      const selectedRows = getSelectedRows();
      onDeleteSelected(selectedRows);
    }
  };
  
  const handleExportSelected = () => {
    if (onExportSelected) {
      const selectedRows = getSelectedRows();
      onExportSelected(selectedRows);
    }
  };
  
  // Check if we are on mobile
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Function to render mobile card view
  const renderMobileCards = () => {
    return (
      <div className="space-y-3 px-2 pb-2">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            // Get the select cell (if selectable is true)
            const selectCell = selectable ? row.getVisibleCells()[0] : null;
            // Get the actual data cells (skipping select cell if it exists)
            const dataCells = selectable 
              ? row.getVisibleCells().slice(1) 
              : row.getVisibleCells();
            
            // Find important cells based on your data model
            // For transactions, we might want to show date, title, amount
            // Note: This assumes specific column structure
            const titleCell = dataCells.find(cell => cell.column.id.includes('title'));
            const dateCell = dataCells.find(cell => cell.column.id.includes('date'));
            const amountCell = dataCells.find(cell => cell.column.id.includes('amount'));
            const typeCell = dataCells.find(cell => cell.column.id.includes('type'));
            
            return (
              <div 
                key={row.id}
                className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${row.getIsSelected() ? 'ring-2 ring-[#007AFF]' : 'ring-1 ring-gray-200/80'}`}
              >
                {/* Card Header - Main Info */}
                <div 
                  className={`flex justify-between items-center px-4 py-3 border-b ${
                    row.original.type === 'income' 
                      ? 'bg-gradient-to-r from-[#34C759]/10 to-[#34C759]/5 border-[#34C759]/20' 
                      : 'bg-gradient-to-r from-[#FF3B30]/10 to-[#FF3B30]/5 border-[#FF3B30]/20'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Selection Checkbox (if selectable) */}
                    {selectCell && (
                      <div onClick={(e) => e.stopPropagation()}>
                        {flexRender(
                          selectCell.column.columnDef.cell,
                          selectCell.getContext()
                        )}
                      </div>
                    )}
                    
                    {/* Title & Date with Icon */}
                    <div className="flex items-center">
                      {/* Category Color Indicator or Type Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 mr-3 rounded-full flex items-center justify-center ${
                        row.original.type === 'income' 
                          ? 'bg-gradient-to-br from-[#34C759] to-[#30D158]' 
                          : 'bg-gradient-to-br from-[#FF3B30] to-[#FF453A]'
                      }`}>
                        {row.original.type === 'income' ? (
                          <ArrowDown className="h-4 w-4 text-white transform rotate-180" />
                        ) : (
                          <ArrowUp className="h-4 w-4 text-white transform rotate-180" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-sm text-gray-900 flex items-center">
                          {titleCell ? flexRender(
                            titleCell.column.columnDef.cell,
                            titleCell.getContext()
                          ) : ''}
                        </h3>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center">
                          <Calendar className="h-3 w-3 inline mr-1 text-gray-400" />
                          {dateCell ? flexRender(
                            dateCell.column.columnDef.cell,
                            dateCell.getContext()
                          ) : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Amount */}
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${
                      row.original.type === 'income' 
                        ? 'text-[#34C759]' 
                        : 'text-[#FF3B30]'
                    }`}>
                      {amountCell ? flexRender(
                        amountCell.column.columnDef.cell,
                        amountCell.getContext()
                      ) : ''}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-end">
                      {row.original.categoryName ? (
                        <>
                          {row.original.categoryColor && (
                            <div 
                              className="w-2 h-2 rounded-full mr-1" 
                              style={{ backgroundColor: row.original.categoryColor }}
                            />
                          )}
                          <span>{row.original.categoryName}</span>
                        </>
                      ) : (
                        <span>Sin categoría</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Hidden details that expand on click */}
                <details className="group">
                  <summary className="px-4 py-2.5 text-xs font-medium text-[#007AFF] hover:bg-[#007AFF]/5 cursor-pointer flex items-center justify-center transition-all duration-200">
                    <span>Ver más detalles</span>
                    <ChevronDown className="h-3 w-3 ml-1 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className={`px-4 py-4 text-xs space-y-3 bg-gradient-to-b ${
                    row.original.type === 'income' 
                      ? 'from-[#34C759]/5 to-white' 
                      : 'from-[#FF3B30]/5 to-white'
                  }`}>
                    {/* Descripción */}
                    {row.original.description && (
                      <div className="flex flex-col space-y-1">
                        <span className="text-[#8E8E93] text-[10px] uppercase tracking-wide font-medium">Descripción</span>
                        <span className="text-gray-900 text-sm">
                          {row.original.description}
                        </span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Categoría */}
                      <div className="flex flex-col space-y-1">
                        <span className="text-[#8E8E93] text-[10px] uppercase tracking-wide font-medium">Categoría</span>
                        <span className="text-gray-900 text-sm flex items-center">
                          {row.original.categoryId ? (
                            <>
                              {row.original.categoryColor && (
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: row.original.categoryColor }}
                                />
                              )}
                              {row.original.categoryName || "Sin categoría"}
                            </>
                          ) : (
                            "Sin categoría"
                          )}
                        </span>
                      </div>
                      
                      {/* Método de pago */}
                      <div className="flex flex-col space-y-1">
                        <span className="text-[#8E8E93] text-[10px] uppercase tracking-wide font-medium">Método de pago</span>
                        <span className="text-gray-900 text-sm">
                          {row.original.paymentMethod || "No especificado"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Notas */}
                    {row.original.notes && (
                      <div className="flex flex-col space-y-1">
                        <span className="text-[#8E8E93] text-[10px] uppercase tracking-wide font-medium">Notas</span>
                        <span className="text-gray-900 text-sm">
                          {row.original.notes}
                        </span>
                      </div>
                    )}
                    
                    {/* Fecha de actualización */}
                    {row.original.updatedAt && (
                      <div className="flex flex-col space-y-1">
                        <span className="text-[#8E8E93] text-[10px] uppercase tracking-wide font-medium">Actualización</span>
                        <span className="text-gray-900 text-sm flex items-center">
                          <Clock className="h-3 w-3 mr-1.5 text-gray-400" />
                          {new Date(row.original.updatedAt).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    )}
                    
                    {/* Botones de acción */}
                    <div className="pt-2 flex justify-end space-x-2">
                      <button 
                        className="text-xs flex items-center justify-center px-3 py-1.5 
                                  rounded-full bg-[#007AFF]/10 text-[#007AFF] font-medium
                                  hover:bg-[#007AFF]/20 transition-colors duration-200"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </button>
                      <button 
                        className="text-xs flex items-center justify-center px-3 py-1.5 
                                  rounded-full bg-[#FF3B30]/10 text-[#FF3B30] font-medium
                                  hover:bg-[#FF3B30]/20 transition-colors duration-200"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-gray-500">
            No hay resultados.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Barra de acción flotante - aparece cuando hay elementos seleccionados */}
      {selectedRowCount > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 
                        flex items-center space-x-2 px-4 py-3 
                        bg-[#007AFF] rounded-full shadow-lg
                        text-white text-sm animate-in fade-in slide-in-from-bottom-5">
          <span>
            {selectedRowCount} {selectedRowCount === 1 ? 'elemento' : 'elementos'} seleccionado{selectedRowCount !== 1 ? 's' : ''}
          </span>
          
          <div className="h-4 border-l border-white/30 mx-2"></div>
          
          {/* Botones de acción en lote */}
          <div className="flex items-center space-x-3">
            {onExportSelected && (
              <button
                onClick={handleExportSelected}
                className="flex items-center hover:bg-white/10 px-2 py-1 rounded-full"
              >
                <FileDown className="h-4 w-4 mr-1" />
                <span>Exportar</span>
              </button>
            )}
            
            {onDeleteSelected && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center hover:bg-white/10 px-2 py-1 rounded-full"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                <span>Eliminar</span>
              </button>
            )}
          </div>
          
          {/* Botón para cancelar la selección */}
          <button
            onClick={() => table.resetRowSelection()}
            className="ml-2 hover:bg-white/10 p-1 rounded-full"
            title="Cancelar selección"
          >
            <span className="sr-only">Cancelar selección</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Search input con estilo Apple, botones de acción y botón de filtro */}
      {showSearch && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 px-4 gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8E8E93]" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={handleSearch}
              className="pl-9 h-10 rounded-full border-[#E5E5EA] bg-[#F2F2F7] focus:border-[#007AFF] focus:ring-[#007AFF]/10 text-sm placeholder:text-[#8E8E93] shadow-inner"
            />
          </div>
          
          {/* Botones de acción habituales */}
          {actionButtons && (
            <div className="flex items-center gap-2 md:ml-4">
              {actionButtons}
            </div>
          )}
          
          {/* Botón de filtro */}
          {filterButton && (
            <div className="ml-2">
              {filterButton}
            </div>
          )}
        </div>
      )}

      {/* Renderización condicional: tabla para desktop, tarjetas para móvil */}
      {isMobile ? (
        renderMobileCards()
      ) : (
        <div className="rounded-xl overflow-x-auto bg-white">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b-0">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead 
                        key={header.id} 
                        className="whitespace-nowrap px-5 py-3 font-medium text-xs text-[#8E8E93] bg-[#F2F2F7] tracking-wide uppercase first:rounded-tl-xl last:rounded-tr-xl"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`
                      transition-colors duration-200 
                      ${index !== table.getRowModel().rows.length - 1 ? 'border-b border-[#E5E5EA]/80' : ''}
                      bg-white
                      hover:bg-[#F2F2F7]/60
                    `}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id} 
                        className="py-3.5 px-5 text-sm text-gray-800"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-gray-500"
                  >
                    No hay resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-2 py-4 px-4 mt-2">
          <div className="text-xs sm:text-sm text-gray-500">
            <span className="hidden sm:inline">Mostrando </span>
            <span className="font-medium text-gray-700">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>
            <span className="hidden sm:inline"> a </span>
            <span className="sm:hidden">-</span>
            <span className="font-medium text-gray-700">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>
            <span className="hidden sm:inline"> de </span>
            <span className="sm:hidden"> / </span>
            <span className="font-medium text-gray-700">{table.getFilteredRowModel().rows.length}</span>
            <span className="hidden sm:inline"> resultados</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-gray-100"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Página anterior</span>
              <ChevronLeft className="h-4 w-4 text-gray-700" />
            </button>
            <span className="text-xs font-medium text-gray-700 px-1">
              {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </span>
            <button
              className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-gray-100"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Página siguiente</span>
              <ChevronRight className="h-4 w-4 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
