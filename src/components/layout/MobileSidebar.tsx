import { X, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useProductStore } from '@/stores/useProductStore';
import { useMemo, useState } from 'react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSidebar = ({ isOpen, onClose }: MobileSidebarProps) => {
  const products = useProductStore((s) => s.products);
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    publisher: false,
    genre: false,
  });
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const publishers = useMemo(() =>
    Array.from(new Set(products.filter((p) => !p.hidden).flatMap((p) => p.publisher.split(/[,/]\s*/).map((s) => s.trim())))).filter(Boolean).sort(),
    [products]);

  const genres = useMemo(() =>
    Array.from(new Set(products.filter((p) => !p.hidden).flatMap((p) => p.genre.split(/[,/]\s*/).map((s) => s.trim())))).filter(Boolean).sort(),
    [products]);

  const goTo = (url: string) => { navigate(url); onClose(); };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-72 bg-card border-l border-border z-50 overflow-y-auto flex flex-col" style={{ animation: 'slideInRight 0.2s ease' }}>
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-primary">
            OWARIN
          </span>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── Store Navigation ── */}
          <nav className="flex-1 flex flex-col">
            {/* Main links */}
            <div className="p-4 space-y-1 border-b border-border">
              {[
                { to: '/', label: 'HOME' },
                { to: '/all-products', label: 'ALL PRODUCTS' },
                { to: '/checkout', label: 'CHECKOUT' },
                { to: '/admin', label: 'ADMIN' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 font-mono text-[10px] tracking-[0.2em] uppercase text-white/32 hover:text-[#C4A35B] transition-colors">
                  <span className="text-white/18 text-[10px] leading-none">—</span>
                  {label}
                </Link>
              ))}
            </div>

            {/* ── PUBLISHER — collapsible ── */}
            {publishers.length > 0 && (
              <div className="border-b border-border">
                <button onClick={() => toggle('publisher')}
                  className="w-full flex items-center justify-between px-5 py-4 text-[11px] font-semibold tracking-[0.2em] text-[#D4AF37] uppercase hover:text-primary transition-colors">
                  PUBLISHER
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expanded.publisher ? 'rotate-180' : ''}`} />
                </button>
                {expanded.publisher && (
                  <div className="px-3 pb-3 space-y-0.5">
                    {publishers.map((pub) => (
                      <button key={pub} onClick={() => goTo(`/all-products?publisher=${encodeURIComponent(pub)}`)}
                        className="w-full text-left px-3 py-2 text-sm text-secondary-foreground hover:text-primary hover:bg-secondary transition-colors">
                        {pub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── GENRE — collapsible ── */}
            {genres.length > 0 && (
              <div className="border-b border-border">
                <button onClick={() => toggle('genre')}
                  className="w-full flex items-center justify-between px-5 py-4 text-[11px] font-semibold tracking-[0.2em] text-[#D4AF37] uppercase hover:text-primary transition-colors">
                  GENRE
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expanded.genre ? 'rotate-180' : ''}`} />
                </button>
                {expanded.genre && (
                  <div className="px-3 pb-3 space-y-0.5">
                    {genres.map((g) => (
                      <button key={g} onClick={() => goTo(`/all-products?genre=${encodeURIComponent(g)}`)}
                        className="w-full text-left px-3 py-2 text-sm text-secondary-foreground hover:text-primary hover:bg-secondary transition-colors">
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
      </aside>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default MobileSidebar;
