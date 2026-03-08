import { useRef, useState, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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
  // open ควบคุมด้วย user action เท่านั้น (ไม่ auto-open จาก useEffect)
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeDropdown = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    // เปิด dropdown เมื่อ user พิมพ์และมี suggestions
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeDropdown();
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((prev) =>
        suggestions.length ? (prev + 1) % suggestions.length : -1
      );
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        suggestions.length ? (prev - 1 + suggestions.length) % suggestions.length : -1
      );
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      // ถ้ามี activeIndex → select suggestion นั้น
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        const q = suggestions[activeIndex].label;
        supabase.from('search_queries').insert({ query: q });
        onSelectSuggestion(suggestions[activeIndex]);
      } else {
        // กด Enter โดยไม่ select → search ด้วยสิ่งที่พิมพ์อยู่ (free-form)
        const q = value.trim();
        if (q) supabase.from('search_queries').insert({ query: q });
        onSearch?.(value);
      }
      // ปิด dropdown ทันที ไม่ว่าจะเกิดอะไรขึ้น
      closeDropdown();
      inputRef.current?.blur();
      return;
    }
  };

  const handleSelect = (s: GlobalSearchSuggestion) => {
    supabase.from('search_queries').insert({ query: s.label });
    onSelectSuggestion(s);
    closeDropdown();
    inputRef.current?.blur();
  };

  const showDropdown = open && suggestions.length > 0 && value.trim().length > 0;

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
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (value.trim()) setOpen(true); }}
        onBlur={() => setTimeout(closeDropdown, 150)}
        className="w-full bg-secondary border border-border rounded pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-md shadow-sm max-h-56 overflow-y-auto text-sm z-50">
          {suggestions.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => e.preventDefault()} // ป้องกัน blur ก่อน click
              onClick={() => handleSelect(s)}
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
