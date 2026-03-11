import { Menu, Search } from 'lucide-react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCartStore } from '@/stores/useCartStore';
import { useAppStore } from '@/stores/useAppStore';
import { useProductStore } from '@/stores/useProductStore';
import { useMemo } from 'react';

interface HeaderProps {
  onMenuToggle: () => void;
  onCartOpen?: () => void;
}

const CartIcon = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M1 1h2.5l1.8 8h9l1.7-6H5" />
    <circle cx="8" cy="16" r="1" />
    <circle cx="14" cy="16" r="1" />
  </svg>
);

const Header = ({ onMenuToggle, onCartOpen }: HeaderProps) => {
  const itemCount = useCartStore((s) => s.items.length);
  const openCart = useCartStore((s) => s.openCart);
  const storeName = useAppStore((s) => s.headerName);
  const logoUrl = useAppStore((s) => s.logoUrl);
  const products = useProductStore((s) => s.products);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activePlatform = searchParams.get('platform') || '';

  const handleCartClick = () => {
    if (onCartOpen) onCartOpen();
    else openCart();
  };

  const platforms = useMemo(() => {
    const set = new Set(
      products
        .filter((p) => !p.hidden)
        .flatMap((p) => p.platform.split(/[,/]\s*/).map((s) => s.trim()))
    );
    return Array.from(set).filter(Boolean).sort();
  }, [products]);

  const isAllProductsPage = location.pathname === '/all-products';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0c0c0e] sm:bg-background/95 sm:backdrop-blur-sm border-b border-white/5">

      {/* ── Row 1 ── */}
      <div className="flex items-center justify-between px-4 h-12">

        {/* Logo + Store name */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
          {logoUrl && (
            <img src={logoUrl} alt="logo"
              style={{ height: 26 }}
              className="w-auto object-contain flex-shrink-0" />
          )}
          <span className="font-mono text-[12px] tracking-[0.28em] uppercase text-white/65 whitespace-nowrap">
            {storeName || 'OWARIN'}
          </span>
        </Link>

        {/* Right icons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => navigate('/all-products')}
            className="p-2.5 text-white/40 hover:text-white/75 transition-colors">
            <Search size={15} />
          </button>

          <button onClick={handleCartClick}
            className="flex items-center gap-1.5 px-2.5 py-2 text-white/40 hover:text-white/75 transition-colors">
            <CartIcon />
            {itemCount > 0 && (
              <span className="font-mono text-[11px] text-[#C4A35B] leading-none tabular-nums">
                {itemCount}
              </span>
            )}
          </button>

          {/* Hamburger — all breakpoints */}
          <button onClick={onMenuToggle}
            className="p-2.5 text-white/40 hover:text-white/75 transition-colors">
            <Menu size={17} />
          </button>
        </div>
      </div>

      {/* ── Row 2: Platform bar ── */}
      <div
        className="border-t border-white/5 overflow-x-auto scrollbar-hide"
        style={{ touchAction: 'pan-x' }}
        onWheel={(e) => { if (e.deltaY === 0) return; e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; }}
      >
        <div className="flex items-stretch px-2 h-9 w-max min-w-full">
          <Link to="/all-products"
            className={`font-mono text-[10px] tracking-[0.2em] uppercase px-3 flex items-center whitespace-nowrap transition-colors border-b-[1.5px] ${
              isAllProductsPage && !activePlatform
                ? 'text-[#C4A35B] border-[#C4A35B]'
                : 'text-white/38 border-transparent hover:text-white/65'
            }`}>
            ALL
          </Link>
          {platforms.map((platform) => (
            <Link key={platform}
              to={`/all-products?platform=${encodeURIComponent(platform)}`}
              className={`font-mono text-[10px] tracking-[0.2em] uppercase px-3 flex items-center whitespace-nowrap transition-colors border-b-[1.5px] ${
                activePlatform === platform
                  ? 'text-[#C4A35B] border-[#C4A35B]'
                  : 'text-white/38 border-transparent hover:text-white/65'
              }`}>
              {platform}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
