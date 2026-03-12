import { useRef, useState, useCallback, type KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';
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

// ✅ Debounce utility — ป้องกัน save query ทุก keystroke
function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]) as T;
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

  const closeDropdown = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  // ✅ Debounce บันทึก search query — save เฉพาะเมื่อหยุดพิมพ์ 600ms
  const saveQueryDebounced = useDebounce((q: string) => {
    if (q.trim().length >= 2) {
      supabase.from('search_queries').insert({ query: q.trim() });
    }
  }, 600);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setOpen(true);
    setActiveIndex(-1);
    saveQueryDebounced(e.target.value);
  };

  const handleClear = () => {
    onChange('');
    closeDropdown();
    inputRef.current?.focus();
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
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        onSelectSuggestion(suggestions[activeIndex]);
      } else {
        onSearch?.(value);
      }
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
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
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
        className="w-full bg-secondary border border-border pl-9 pr-9 py-2 text-[13px] text-foreground placeholder:text-white/25 focus:outline-none focus:border-[#C4A35B]/50 transition-colors"
      />

      {/* Clear button — เฉพาะเมื่อมี value */}
      {value.length > 0 && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()} // ป้องกัน blur ก่อน click
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-white/28 hover:text-white/65 transition-colors"
        >
          <X size={13} />
        </button>
      )}

      {/* Suggestion dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 bg-card border border-border shadow-lg max-h-64 overflow-y-auto text-sm z-50">
          {suggestions.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className={cn(
                'w-full text-left px-4 py-2.5 transition-colors border-b border-white/4 last:border-0',
                idx === activeIndex
                  ? 'bg-white/6 text-white/90'
                  : 'text-white/60 hover:bg-white/4 hover:text-white/85'
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] tracking-[0.01em] truncate">{s.label}</span>
                {s.subtitle && (
                  <span className="font-mono text-[10px] text-white/28 tracking-[0.1em] truncate">
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
