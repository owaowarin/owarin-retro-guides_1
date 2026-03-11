import { Link } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import type { Product } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';
import { useAppStore } from '@/stores/useAppStore';

interface ProductCardProps {
  product: Product;
  priority?: boolean; // true = eager load (above-the-fold cards)
}

const ProductCard = ({ product, priority = false }: ProductCardProps) => {
  const { items, toggleItem } = useCartStore();
  const discountRate = useAppStore((s) => s.discountRate);
  void discountRate;

  const isSoldOut = product.statusTag === 'soldOut';
  const isInCart = items.some((i) => i.productId === product.id);
  const price = product.price;

  const releaseYear = product.releaseDate
    ? new Date(product.releaseDate).getFullYear()
    : null;

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

  const maxLen = 52;
  const isTruncated = product.title.length > maxLen;
  const shortTitle = isTruncated ? product.title.slice(0, maxLen).trimEnd() : product.title;
  const genreTags = product.genre
    ? product.genre.split(',').map((g) => g.trim()).filter(Boolean).slice(0, 2)
    : [];

  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col h-full">

      {/* ── Image 1:1 ── */}
      <div className="relative aspect-square overflow-hidden bg-[#111114] mb-2.5">
        <img
          src={product.frontImage}
          alt={product.title}
          width={400}
          height={400}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'low'}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${
            isSoldOut
              ? 'brightness-[0.42] grayscale-[55%]'
              : 'brightness-[0.92] group-hover:brightness-100'
          }`}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
        />
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-[#C4A35B]/65 border border-[#C4A35B]/22 px-3 py-1.5">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-grow">

        {/* Release Year */}
        {releaseYear && (
          <span className="font-mono text-[9px] sm:text-[10px] text-white/25 tracking-[0.15em] mb-1 leading-none">
            {releaseYear}
          </span>
        )}

        {/* Title — fixed height, 2 lines */}
        <div className="h-[3.2rem] mb-1.5 overflow-hidden">
          <h3 className="text-[13px] font-light text-white/72 leading-snug group-hover:text-white/92 transition-colors tracking-[0.01em]">
            {shortTitle}
            {isTruncated && (
              <span className="font-mono text-[9px] text-white/20 ml-1">[—]</span>
            )}
          </h3>
        </div>

        {/* Platform tags */}
        {product.platform && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {product.platform.split('/').map((s) => s.trim()).filter(Boolean).map((plat) => (
              <span
                key={plat}
                className="font-mono text-[9px] tracking-[0.12em] uppercase text-white/30 border border-white/8 px-1.5 h-[18px] inline-flex items-center leading-none"
              >
                {plat}
              </span>
            ))}
          </div>
        )}

        {/* Genre tags */}
        {genreTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 min-h-[18px]">
            {genreTags.map((g) => (
              <span
                key={g}
                className="font-mono text-[9px] tracking-[0.1em] uppercase text-[#C4A35B]/52 border border-[#C4A35B]/18 px-1.5 h-[18px] inline-flex items-center leading-none"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Price + Cart */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="font-mono text-[12px] sm:text-[13px] font-bold text-[#D4AF37] lining-nums">
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
            {isInCart ? <Check size={11} /> : <Plus size={11} />}
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
