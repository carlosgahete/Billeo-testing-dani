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
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  pagination?: boolean;
  filterButton?: React.ReactNode;
  showSearch?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onSearch,
  searchPlaceholder = "Buscar...",
  pagination = true,
  filterButton,
  showSearch = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
  });

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

  return (
    <div>
      {/* Search input con estilo Apple y botón de filtro */}
      {showSearch && (
        <div className="flex items-center justify-between py-4 px-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8E8E93]" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={handleSearch}
              className="pl-9 rounded-xl border-[#E5E5EA] bg-[#F2F2F7] focus:border-[#007AFF] focus:ring-[#007AFF]/20 text-sm placeholder:text-[#8E8E93]"
            />
          </div>
          {filterButton && (
            <div className="ml-2">
              {filterButton}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200/60 shadow-sm overflow-x-auto bg-white">
        <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-0">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id} 
                      className="whitespace-nowrap px-5 py-3.5 font-medium text-xs text-gray-500 bg-gray-50/80 tracking-wide uppercase first:rounded-tl-2xl last:rounded-tr-2xl"
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
                    ${index !== table.getRowModel().rows.length - 1 ? 'border-b border-gray-100/80' : ''}
                    bg-white
                    hover:bg-gray-50/80
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
