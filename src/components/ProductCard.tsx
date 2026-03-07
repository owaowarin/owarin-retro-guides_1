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
  const isSoldOut = product.statusTag === 'soldOut';
  const isInCart = items.some((i) => i.productId === product.id);

  // ─── Discount calculation ───────────────────────────────────────────────
  const hasDiscount = discountRate > 0;
  const discountedPrice = hasDiscount ? Math.round(product.price * (1 - discountRate / 100)) : product.price;
  const discountPercent = Math.round(discountRate);
  // ───────────────────────────────────────────────────────────────────────

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSoldOut) {
      toggleItem({
        productId: product.id,
        title: product.title,
        price: discountedPrice,
        platform: product.platform,
        frontImage: product.frontImage,
      });
    }
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className={`group flex flex-col h-full animate-fade-in ${isSoldOut ? 'opacity-70' : ''}`}
    >
      {/* 1. Image Section */}
      <div className="relative aspect-[3/4] overflow-hidden rounded bg-secondary mb-3 border border-border group-hover:border-primary/40 transition-colors">
        <img
          src={product.frontImage}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* DISCOUNT BADGE — ลบบรรทัดนี้ทิ้งเมื่อเอา discount ออก */}
        {hasDiscount && !isSoldOut && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm shadow-md">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* 2. Info Section */}
      <div className="flex flex-col flex-grow">
        {/* Title */}
        {(() => {
          const maxLen = 36;
          const isTruncated = product.title.length > maxLen;
          const shortTitle = isTruncated ? product.title.slice(0, maxLen).trimEnd() : product.title;
          return (
            <div className="h-[2.75rem] mb-1 overflow-hidden">
              <h3 className="font-display text-sm text-foreground leading-snug group-hover:text-primary transition-colors cursor-default">
                {shortTitle}{isTruncated && <span className="text-[10px] text-muted-foreground/60 tracking-wider ml-1">more</span>}
              </h3>
            </div>
          );
        })()}

        {/* Platform tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {product.platform
            ? product.platform.split('/').map((s) => s.trim()).filter(Boolean).map((plat) => (
                <span key={plat} className="text-[10px] font-medium text-foreground/80 tracking-[0.08em] uppercase bg-secondary border border-border rounded px-1.5 py-0.5">
                  {plat}
                </span>
              ))
            : null}
        </div>

        {/* Genre tags */}
        {(() => {
          const tags = product.genre
            ? product.genre.split(',').map((g) => g.trim()).filter(Boolean)
            : [];
          const MAX = 3;
          const visible = tags.slice(0, MAX);
          const overflow = tags.length - MAX;
          return (
            <div className="flex flex-wrap gap-1 mb-2 min-h-[1.5rem]">
              {visible.map((g) => (
                <span key={g} className="text-[9px] text-[#C6A355] border border-[#C6A355]/40 rounded-sm px-2 py-1 leading-none tracking-wide whitespace-nowrap inline-flex items-center justify-center">
                  {g}
                </span>
              ))}
              {overflow > 0 && (
                <span className="text-[9px] text-[#C6A355]/50 border border-[#C6A355]/20 rounded-sm px-1.5 py-0.5 leading-tight tracking-wide">
                  +{overflow}
                </span>
              )}
            </div>
          );
        })()}

        {/* 3. Price & Cart */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col leading-tight">
            {/* ราคาเต็มขีดทับ — ลบบรรทัดนี้เมื่อเอา discount ออก */}
            {hasDiscount && (
              <span className="text-[10px] text-muted-foreground/50 line-through">
                {product.price.toLocaleString()} THB
              </span>
            )}
            <p className="text-sm font-medium text-primary">
              {discountedPrice.toLocaleString()} THB
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isSoldOut}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isInCart
                ? 'bg-primary text-primary-foreground'
                : isSoldOut
                ? 'bg-secondary/60 text-muted-foreground cursor-not-allowed'
                : 'bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground'
            }`}
          >
            {isInCart ? <Check size={14} /> : <ShoppingBag size={14} />}
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
