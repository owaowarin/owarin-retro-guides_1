import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlobalSearchSuggestion {
  id: string;
  label: string;
  subtitle?: string;
}

interface GlobalSearchProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: GlobalSearchSuggestion[];
  onSelectSuggestion: (suggestion: GlobalSearchSuggestion) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const GlobalSearch = ({
  value,
  onChange,
  suggestions,
  onSelectSuggestion,
  onSearch,
  placeholder = 'Search…',
  className,
}: GlobalSearchProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (suggestions.length > 0) {
      setOpen(true);
      setActiveIndex(0);
    } else {
      setOpen(false);
      setActiveIndex(-1);
    }
  }, [suggestions]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        onSelectSuggestion(suggestions[activeIndex]);
      } else {
        onSearch?.(value);
      }
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full bg-secondary border border-border rounded pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-md shadow-sm max-h-56 overflow-y-auto text-sm z-50">
          {suggestions.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => onSelectSuggestion(s)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-secondary-foreground hover:bg-secondary',
                idx === activeIndex && 'bg-secondary'
              )}
            >
              <div className="flex flex-col">
                <span className="truncate">{s.label}</span>
                {s.subtitle && (
                  <span className="text-[11px] text-muted-foreground truncate">
                    {s.subtitle}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

