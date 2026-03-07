import { X, Home, ShoppingBag, Shield, Gamepad2, Disc, LayoutGrid, ClipboardList, Package, Palette, User, Tags, CreditCard, FileText, Settings } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useProductStore } from '@/stores/useProductStore';
import { useMemo } from 'react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // optional: admin tab switcher
  onAdminTab?: (tab: number) => void;
  activeAdminTab?: number;
}

const MobileSidebar = ({ isOpen, onClose, onAdminTab, activeAdminTab }: MobileSidebarProps) => {
  const products = useProductStore((s) => s.products);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';

  const platforms = useMemo(() => Array.from(new Set(products.filter((p) => !p.hidden).flatMap((p) => p.platform.split(/[,/]\s*/).map((s) => s.trim())))).filter(Boolean).sort(), [products]);
  const genres = useMemo(() => Array.from(new Set(products.filter((p) => !p.hidden).flatMap((p) => p.genre.split(/[,/]\s*/).map((s) => s.trim())))).filter(Boolean).sort(), [products]);

  const handlePlatformClick = (platform: string) => {
    navigate(`/all-products?platform=${encodeURIComponent(platform)}`);
    onClose();
  };
  const handleGenreClick = (genre: string) => {
    navigate(`/all-products?genre=${encodeURIComponent(genre)}`);
    onClose();
  };

  if (!isOpen) return null;

  /* ── ADMIN sidebar ── */
  const adminMenu = [
    {
      label: 'ORDERS',
      icon: ClipboardList,
      tab: 0,
    },
    {
      label: 'MY PRODUCTS',
      icon: Package,
      tab: 1,
    },
    {
      label: 'APPEARANCE',
      icon: Palette,
      tab: 2,
      sub: [
        { label: 'Store Info', tab: 2 },
        { label: 'Categories', tab: 2 },
        { label: 'Payment Details', tab: 2 },
        { label: 'Order Confirmation', tab: 2 },
        { label: 'Condition Settings', tab: 2 },
      ],
    },
    {
      label: 'ACCOUNT',
      icon: User,
      tab: 3,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 animate-slide-in-left overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-display text-lg text-primary tracking-widest">
            {isAdminPage ? 'ADMIN' : 'OWARIN'}
          </span>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {isAdminPage ? (
          /* ── Admin Navigation ── */
          <nav className="p-4 space-y-1">
            {/* Back to store */}
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 text-sm tracking-wider text-muted-foreground hover:text-primary hover:bg-secondary rounded transition-colors mb-4"
            >
              <Home size={16} />
              BACK TO STORE
            </Link>

            <div className="border-t border-border pt-4 space-y-1">
              {adminMenu.map(({ label, icon: Icon, tab, sub }) => (
                <div key={label}>
                  <button
                    onClick={() => { onAdminTab?.(tab); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm tracking-wider rounded transition-colors ${
                      activeAdminTab === tab ? 'text-primary bg-secondary' : 'text-secondary-foreground hover:text-primary hover:bg-secondary'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                  {sub && (
                    <div className="ml-8 mt-0.5 space-y-0.5">
                      {sub.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => { onAdminTab?.(s.tab); onClose(); }}
                          className="w-full text-left px-3 py-1.5 text-[11px] tracking-[0.1em] text-muted-foreground hover:text-primary rounded transition-colors"
                        >
                          {s.label}
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
          <nav className="p-4 space-y-8">
            <div className="space-y-1">
              {[
                { to: '/', label: 'HOME', icon: Home },
                { to: '/all-products', label: 'ALL PRODUCTS', icon: LayoutGrid },
                { to: '/checkout', label: 'CHECKOUT', icon: ShoppingBag },
                { to: '/admin', label: 'ADMIN', icon: Shield },
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm tracking-wider text-secondary-foreground hover:text-primary hover:bg-secondary rounded transition-colors"
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>

            {platforms.length > 0 && (
              <div>
                <h3 className="px-3 text-[11px] font-semibold tracking-[0.2em] text-[#D4AF37] uppercase mb-3">Platforms</h3>
                <div className="space-y-1">
                  {platforms.map((platform) => (
                    <button key={platform} onClick={() => handlePlatformClick(platform)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-secondary-foreground hover:text-primary hover:bg-secondary rounded transition-colors">
                      <Gamepad2 size={14} className="opacity-50" />{platform}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {genres.length > 0 && (
              <div>
                <h3 className="px-3 text-[11px] font-semibold tracking-[0.2em] text-[#D4AF37] uppercase mb-3">Genres</h3>
                <div className="space-y-1">
                  {genres.map((genre) => (
                    <button key={genre} onClick={() => handleGenreClick(genre)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-secondary-foreground hover:text-primary hover:bg-secondary rounded transition-colors">
                      <Disc size={14} className="opacity-50" />{genre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </nav>
        )}
      </aside>
    </>
  );
};

export default MobileSidebar;
