import { X, Home, ShoppingBag, Shield, LayoutGrid, ClipboardList, Package, Palette, User, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useProductStore } from '@/stores/useProductStore';
import { useMemo, useState } from 'react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminTab?: (tab: number) => void;
  activeAdminTab?: number;
}

const MobileSidebar = ({ isOpen, onClose, onAdminTab, activeAdminTab }: MobileSidebarProps) => {
  const products = useProductStore((s) => s.products);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    platform: false,
    publisher: false,
    genre: false,
  });
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const platforms = useMemo(() =>
    Array.from(new Set(products.filter((p) => !p.hidden).flatMap((p) => p.platform.split(/[,/]\s*/).map((s) => s.trim())))).filter(Boolean).sort(),
    [products]);

  const publishers = useMemo(() =>
    Array.from(new Set(products.filter((p) => !p.hidden).flatMap((p) => p.publisher.split(/[,/]\s*/).map((s) => s.trim())))).filter(Boolean).sort(),
    [products]);

  const genres = useMemo(() =>
    Array.from(new Set(products.filter((p) => !p.hidden).flatMap((p) => p.genre.split(/[,/]\s*/).map((s) => s.trim())))).filter(Boolean).sort(),
    [products]);

  const goTo = (url: string) => { navigate(url); onClose(); };

  if (!isOpen) return null;

  const adminMenu = [
    { label: 'ORDERS', icon: ClipboardList, tab: 0 },
    { label: 'MY PRODUCTS', icon: Package, tab: 1 },
    {
      label: 'APPEARANCE', icon: Palette, tab: 2,
      sub: ['Store Info', 'Categories', 'Payment Details', 'Order Confirmation', 'Condition Settings'],
    },
    { label: 'ACCOUNT', icon: User, tab: 3 },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 animate-slide-in-left overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <span className="font-display text-lg text-primary tracking-widest">
            {isAdminPage ? 'ADMIN' : 'OWARIN'}
          </span>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {isAdminPage ? (
          /* ── Admin Navigation ── */
          <nav className="p-4 space-y-1 flex-1">
            <Link to="/" onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 text-sm tracking-wider text-muted-foreground hover:text-primary hover:bg-secondary rounded transition-colors mb-4">
              <Home size={16} /> BACK TO STORE
            </Link>
            <div className="border-t border-border pt-4 space-y-1">
              {adminMenu.map(({ label, icon: Icon, tab, sub }) => (
                <div key={label}>
                  <button onClick={() => { onAdminTab?.(tab); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm tracking-wider rounded transition-colors ${
                      activeAdminTab === tab ? 'text-primary bg-secondary' : 'text-secondary-foreground hover:text-primary hover:bg-secondary'
                    }`}>
                    <Icon size={16} />{label}
                  </button>
                  {sub && (
                    <div className="ml-8 mt-0.5 space-y-0.5">
                      {sub.map((s) => (
                        <button key={s} onClick={() => { onAdminTab?.(tab); onClose(); }}
                          className="w-full text-left px-3 py-1.5 text-[11px] tracking-[0.1em] text-muted-foreground hover:text-primary rounded transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </nav>
        ) : (
          /* ── Store Navigation ── */
          <nav className="flex-1 flex flex-col">
            {/* Main links */}
            <div className="p-4 space-y-1 border-b border-border">
              {[
                { to: '/', label: 'HOME', icon: Home },
                { to: '/all-products', label: 'ALL PRODUCTS', icon: LayoutGrid },
                { to: '/checkout', label: 'CHECKOUT', icon: ShoppingBag },
                { to: '/admin', label: 'ADMIN', icon: Shield },
              ].map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm tracking-wider text-secondary-foreground hover:text-primary hover:bg-secondary rounded transition-colors">
                  <Icon size={16} />{label}
                </Link>
              ))}
            </div>

            {/* ── PLATFORM — collapsible ── */}
            {platforms.length > 0 && (
              <div className="border-b border-border">
                <button onClick={() => toggle('platform')}
                  className="w-full flex items-center justify-between px-5 py-4 text-[11px] font-semibold tracking-[0.2em] text-[#D4AF37] uppercase hover:text-primary transition-colors">
                  PLATFORM
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expanded.platform ? 'rotate-180' : ''}`} />
                </button>
                {expanded.platform && (
                  <div className="px-3 pb-3 space-y-0.5">
                    {platforms.map((p) => (
                      <button key={p} onClick={() => goTo(`/all-products?platform=${encodeURIComponent(p)}`)}
                        className="w-full text-left px-3 py-2 text-sm text-secondary-foreground hover:text-primary hover:bg-secondary rounded transition-colors">
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                        className="w-full text-left px-3 py-2 text-sm text-secondary-foreground hover:text-primary hover:bg-secondary rounded transition-colors">
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
                        className="w-full text-left px-3 py-2 text-sm text-secondary-foreground hover:text-primary hover:bg-secondary rounded transition-colors">
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        )}
      </aside>
    </>
  );
};

export default MobileSidebar;
