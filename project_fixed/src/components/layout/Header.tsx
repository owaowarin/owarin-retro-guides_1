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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="relative flex items-center justify-between px-4 h-12 sm:h-14">
        <button onClick={onMenuToggle} className="p-2 text-foreground hover:text-primary transition-colors flex-shrink-0">
          <Menu size={20} />
        </button>

        {/* Store name — always centered, single line, scales with screen */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 font-display tracking-[0.25em] sm:tracking-[0.3em] text-primary font-semibold whitespace-nowrap text-base sm:text-xl leading-none"
        >
          {storeName || 'OWARIN'}
        </Link>

        <button
          onClick={handleCartClick}
          className="p-2 text-foreground hover:text-primary transition-colors relative flex-shrink-0"
        >
          <ShoppingBag size={20} />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
