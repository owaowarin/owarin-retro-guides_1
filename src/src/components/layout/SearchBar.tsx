import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  onSuggestionSelect?: (value: string) => void;
}

const SearchBar = ({ value, onChange, suggestions, onSuggestionSelect }: SearchBarProps) => {
  const hasSuggestions = !!suggestions && suggestions.length > 0;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Search by title, publisher, or year..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-secondary border border-border rounded pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />
        {hasSuggestions && (
          <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-md shadow-sm max-h-48 overflow-y-auto text-sm">
            {suggestions!.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestionSelect?.(s)}
                className="w-full text-left px-3 py-1.5 hover:bg-secondary text-secondary-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
