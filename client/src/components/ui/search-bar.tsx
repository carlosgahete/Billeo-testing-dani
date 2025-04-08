import React, { useState, ChangeEvent } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  filterButton?: React.ReactNode;
  initialValue?: string;
}

export function SearchBar({
  placeholder = 'Buscar...',
  onSearch,
  filterButton,
  initialValue = '',
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (typeof window !== 'undefined') {
      // Debounce para no llamar constantemente mientras el usuario está escribiendo
      window.clearTimeout((window as any).searchTimeout);
      (window as any).searchTimeout = window.setTimeout(() => {
        console.log('SearchBar: Llamando a onSearch con:', newValue);
        onSearch(newValue);
      }, 300);
    }
  };

  return (
    <div className="flex items-center justify-between py-4 px-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8E8E93]" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className="pl-9 rounded-xl border-[#E5E5EA] bg-[#F2F2F7] focus:border-[#007AFF] focus:ring-[#007AFF]/20 text-sm placeholder:text-[#8E8E93]"
        />
      </div>
      {filterButton && (
        <div className="ml-2">
          {filterButton}
        </div>
      )}
    </div>
  );
}