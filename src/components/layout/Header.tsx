import { Menu, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '@/stores/useCartStore';
import { useAppStore } from '@/stores/useAppStore';

interface HeaderProps {
  onMenuToggle: () => void;
  onCartOpen?: () => void;
}

const Header = ({ onMenuToggle, onCartOpen }: HeaderProps) => {
  const itemCount = useCartStore((s) => s.items.length);
  const openCart = useCartStore((s) => s.openCart);
  const storeName = useAppStore((s) => s.headerName);

  const handleCartClick = () => {
    if (onCartOpen) onCartOpen();
    else openCart();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/5">
      <div className="relative flex items-center justify-between px-4 h-12 sm:h-14">

        <button
          onClick={onMenuToggle}
          className="p-2 text-white/35 hover:text-white/70 transition-colors flex-shrink-0"
        >
          <Menu size={18} />
        </button>

        {/* Store name — centered */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 font-display tracking-[0.28em] sm:tracking-[0.35em] text-primary font-semibold whitespace-nowrap text-base sm:text-lg leading-none"
        >
          {storeName || 'OWARIN'}
        </Link>

        {/* Cart */}
        <button
          onClick={handleCartClick}
          className="p-2 text-white/35 hover:text-white/70 transition-colors relative flex-shrink-0"
        >
          <ShoppingBag size={18} />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[#C4A35B] text-[#0c0c0e] font-mono font-bold text-[8px] w-4 h-4 flex items-center justify-center leading-none">
              {itemCount}
            </span>
          )}
        </button>

      </div>
    </header>
  );
};

export default Header;
