import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { RepairModel, Brand } from '@/core/domain/models';

interface ModelComboboxProps {
  models: RepairModel[];
  brands: Brand[];
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelCombobox({ models, brands, value, onChange, disabled }: ModelComboboxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build combined options: "Brand Model"
  const options = models.map((m) => {
    const brand = brands.find((b) => b.id === m.brandId);
    return {
      modelId: m.id,
      label: brand ? `${brand.name} ${m.name}` : m.name,
      category: m.category ?? null,
    };
  });

  const selectedLabel = options.find((o) => o.modelId === value)?.label ?? '';

  // Simple case-insensitive substring filter
  const filtered =
    query.length === 0
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
    if (value) onChange(''); // clear selection while user is searching
  };

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  // The input shows: typed query when open, selected label when closed
  const displayValue = isOpen ? query : selectedLabel;

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div
        className={cn(
          'flex items-center min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            if (value) setQuery('');
          }}
          placeholder="Ej: Samsung S23, iPhone 14..."
          disabled={disabled}
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        {value && !isOpen ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground ml-1 shrink-0 p-0.5 rounded hover:bg-accent transition-colors"
            title="Limpiar selección"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground ml-1 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground italic">
              {query ? `Sin resultados para "${query}"` : 'Sin modelos disponibles'}
            </p>
          ) : (
            filtered.slice(0, 100).map((opt) => (
              <button
                key={opt.modelId}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                onClick={() => handleSelect(opt.modelId)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2',
                  value === opt.modelId && 'bg-accent/70 font-medium',
                )}
              >
                <span>{opt.label}</span>
                {opt.category && (
                  <span className="text-xs text-muted-foreground shrink-0">{opt.category}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
