import { Link } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import type { Product } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';
import { useAppStore } from '@/stores/useAppStore';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { items, toggleItem } = useCartStore();
  const discountRate = useAppStore((s) => s.discountRate);
  void discountRate; // discount disabled

  const isSoldOut = product.statusTag === 'soldOut';
  const isInCart = items.some((i) => i.productId === product.id);
  const price = product.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSoldOut) {
      toggleItem({
        productId: product.id,
        title: product.title,
        price,
        platform: product.platform,
        frontImage: product.frontImage,
      });
    }
  };

  const maxLen = 38;
  const isTruncated = product.title.length > maxLen;
  const shortTitle = isTruncated ? product.title.slice(0, maxLen).trimEnd() : product.title;
  const genreTags = product.genre
    ? product.genre.split(',').map((g) => g.trim()).filter(Boolean).slice(0, 2)
    : [];

  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col h-full">

      {/* ── Image ── */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#111114] mb-2.5">
        <img
          src={product.frontImage}
          alt={product.title}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${
            isSoldOut
              ? 'brightness-[0.42] grayscale-[55%]'
              : 'brightness-[0.92] group-hover:brightness-100'
          }`}
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
        />
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-mono text-[8px] tracking-[0.4em] uppercase text-[#C4A35B]/65 border border-[#C4A35B]/22 px-3 py-1.5">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-grow">

        {/* Title */}
        <div className="h-[2.6rem] mb-1.5 overflow-hidden">
          <h3 className="text-[13px] font-light text-white/72 leading-snug group-hover:text-white/92 transition-colors tracking-[0.01em]">
            {shortTitle}
            {isTruncated && <span className="text-[9px] text-white/22 ml-1">···</span>}
          </h3>
        </div>

        {/* Platform */}
        {product.platform && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {product.platform.split('/').map((s) => s.trim()).filter(Boolean).map((plat) => (
              <span key={plat}
                className="font-mono text-[8px] tracking-[0.12em] uppercase text-white/28 border border-white/7 px-1.5 py-0.5 leading-none">
                {plat}
              </span>
            ))}
          </div>
        )}

        {/* Genre */}
        {genreTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 min-h-[1.2rem]">
            {genreTags.map((g) => (
              <span key={g}
                className="font-mono text-[8px] tracking-[0.1em] uppercase text-[#C4A35B]/50 border border-[#C4A35B]/16 px-1.5 py-0.5 leading-none">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Price + Cart */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="font-mono text-[12px] font-bold text-[#D4AF37] lining-nums">
            {price.toLocaleString()}
            <span className="text-[9px] font-normal text-white/20 tracking-[0.1em] ml-1">THB</span>
          </span>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isSoldOut}
            className={`w-7 h-7 flex items-center justify-center border transition-all duration-150 ${
              isInCart
                ? 'border-[#C4A35B] bg-[#C4A35B] text-[#0c0c0e]'
                : isSoldOut
                ? 'border-white/6 text-white/12 cursor-not-allowed'
                : 'border-white/10 text-white/32 hover:border-[#C4A35B] hover:text-[#C4A35B]'
            }`}
          >
            {isInCart ? <Check size={12} /> : <ShoppingBag size={12} />}
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
