import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Info, ShoppingBag, Check } from 'lucide-react';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/lib/supabase';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useProductStore((s) => s.products.find((p) => p.id === id && !p.hidden));
  const conditionGrades = useAppStore((s) => s.conditionGrades);
  const { items, addItem } = useCartStore();
  const [showBack, setShowBack] = useState(false);
  const [showConditionTooltip, setShowConditionTooltip] = useState(false);
  const [backVisible, setBackVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Track product view
  useEffect(() => {
    if (!id) return;
    supabase.from('product_views').insert({ product_id: id });
  }, [id]);

  useEffect(() => {
    const handler = () => {
      const currentY = window.scrollY;
      if (currentY < 60) {
        setBackVisible(true);
      } else {
        setBackVisible(currentY < lastScrollY.current);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isInCart = items.some((i) => i.productId === id);
  const isSoldOut = product?.statusTag === 'soldOut';
  const discountRate = useAppStore((s) => s.discountRate);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  const hasDiscount = false; // discountRate — disabled
  const discountedPrice = product.price;
  const discountPercent = 0;
  void discountRate;

  const handleAdd = () => {
    if (!isInCart && !isSoldOut) {
      addItem({
        productId: product.id,
        title: product.title,
        price: discountedPrice,
        platform: product.platform,
        frontImage: product.frontImage,
      });
    }
  };

  /* Format release date as MONTH DD, YYYY (e.g. FEBRUARY 28, 2026) */
  const formatReleaseDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  };

  const gradeInfo = conditionGrades.find((g) => g.code === product.condition);
  const conditionLabel = gradeInfo ? `${gradeInfo.code} — ${gradeInfo.name}` : product.condition;

  /* Display title as-is without 「」 wrapping */
  const displayTitle = product.title.replace(/^「|」$/g, '');

  return (
    <div className="min-h-screen bg-background">

      {/* Sticky Back Button — visible on scroll up, hidden on scroll down */}
      <div className={`sticky top-16 z-30 transition-all duration-300 pointer-events-none ${backVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="pointer-events-auto inline-block py-2">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      <main className="pt-2 px-4 pb-24 max-w-5xl mx-auto">

        {/* Desktop: Left/Right split, Mobile: stacked */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT: Image */}
          <div className="lg:w-1/2">
            <div className="relative aspect-[3/4] rounded overflow-hidden bg-secondary border border-border">
              <img
                src={showBack ? product.backImage : product.frontImage}
                alt={product.title}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            </div>
            <button
              onClick={() => setShowBack(!showBack)}
              className="mt-3 w-full bg-card border border-border rounded px-4 py-2 text-xs text-foreground hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              {showBack ? 'FLIP TO FRONT' : '⟲ FLIP TO BACK'}
            </button>
          </div>

          {/* RIGHT: Info */}
          <div className="lg:w-1/2 flex flex-col">
            {/* Title */}
            <h1 className="font-display text-2xl lg:text-3xl text-foreground leading-tight mb-4">
              {displayTitle}
            </h1>

            {/* Platform tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {product.platform
                ? product.platform.split('/').map((s) => s.trim()).filter(Boolean).map((plat) => (
                    <Link key={plat} to={`/all?platform=${encodeURIComponent(plat)}`}
                      className="text-[11px] font-medium text-foreground/80 tracking-[0.1em] uppercase bg-secondary border border-border rounded px-2 py-0.5 hover:border-primary hover:text-primary transition-colors cursor-pointer">
                      {plat}
                    </Link>
                  ))
                : null}
            </div>

            {/* Condition Line */}
            <div className="relative flex items-center gap-2 mb-6">
              <p className="text-[11px] text-muted-foreground tracking-wider opacity-60">
                CONDITION: {conditionLabel}
              </p>
              <button
                onClick={() => setShowConditionTooltip(!showConditionTooltip)}
                className="text-primary hover:text-gold-bright transition-colors"
              >
                <Info size={13} />
              </button>
              {showConditionTooltip && (
                <div className="absolute top-full left-0 mt-2 z-30 w-72 bg-card border border-border rounded-lg shadow-lg p-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-medium text-primary tracking-wider">CONDITION GUIDE</h3>
                    <button onClick={() => setShowConditionTooltip(false)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                  </div>
                  <div className="space-y-3">
                    {conditionGrades.map((g) => (
                      <div key={g.id} className={`flex gap-2 ${g.code === product.condition ? 'opacity-100' : 'opacity-60'}`}>
                        <span className="w-6 h-6 rounded border border-primary flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">{g.code}</span>
                        <div>
                          <p className="text-xs text-foreground font-medium">{g.name}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{g.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="mb-6">
              {hasDiscount ? (
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-display text-primary lining-nums">{discountedPrice.toLocaleString()} THB</p>
                  <p className="text-sm text-muted-foreground line-through lining-nums">{product.price.toLocaleString()}</p>
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">-{discountPercent}%</span>
                </div>
              ) : (
                <p className="text-2xl font-display text-primary lining-nums">{product.price.toLocaleString()} THB</p>
              )}
            </div>

            {/* Add to Cart / Sold Out Button */}
            <button
              onClick={handleAdd}
              disabled={isInCart || isSoldOut}
              className={`w-full py-3 mb-10 rounded text-sm font-medium tracking-wider transition-all flex items-center justify-center gap-2 ${
                isSoldOut
                  ? 'bg-secondary text-muted-foreground border border-border cursor-not-allowed'
                  : isInCart
                  ? 'bg-secondary text-muted-foreground border border-border cursor-default'
                  : 'gold-gradient text-primary-foreground hover:opacity-90'
              }`}
            >
              {isSoldOut ? (
                <>SOLD OUT</>
              ) : isInCart ? (
                <><Check size={16} /> IN BAG</>
              ) : (
                <><ShoppingBag size={16} /> ADD TO CART</>
              )}
            </button>

            {/* Synopsis Section */}
            <div className="border-t border-border pt-6 mt-6">
              <h2 className="text-[14px] tracking-[0.2em] text-[#D4AF37] uppercase mb-4 font-medium">SYNOPSIS</h2>
              <p className="text-sm text-secondary-foreground leading-relaxed">{product.synopsis}</p>
            </div>

            {/* About Section */}
            <div className="border-t border-border pt-6 mt-6">
              <h2 className="text-[14px] tracking-[0.2em] text-[#C6A355] uppercase mb-5 font-medium">About</h2>

              <div className="divide-y divide-white/5">


                {/* Release Dates */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-4 py-3">
                  <span className="text-[10px] text-white/40 uppercase tracking-[0.12em] font-medium pt-0.5">RELEASE DATES</span>
                  <span className="text-sm text-foreground">{formatReleaseDate(product.releaseDate)}</span>
                </div>

                {/* Language */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-4 py-3">
                  <span className="text-[10px] text-white/40 uppercase tracking-[0.12em] font-medium pt-0.5">Language</span>
                  <span className="text-sm text-foreground">{product.language || '—'}</span>
                </div>

                {/* Developers */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-4 py-3">
                  <span className="text-[10px] text-white/40 uppercase tracking-[0.12em] font-medium pt-0.5">Developer</span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.developer
                      ? product.developer.split(',').map((d) => d.trim()).filter(Boolean).map((d) => (
                          <Link key={d} to={`/all?search=${encodeURIComponent(d)}`}
                            className="text-xs text-foreground border border-white/10 bg-white/5 rounded-sm px-2 py-0.5 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer">
                            {d}
                          </Link>
                        ))
                      : <span className="text-sm text-foreground">—</span>
                    }
                  </div>
                </div>

                {/* Publishers */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-4 py-3">
                  <span className="text-[10px] text-white/40 uppercase tracking-[0.12em] font-medium pt-0.5">Publisher</span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.publisher
                      ? product.publisher.split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
                          <Link key={p} to={`/all?publisher=${encodeURIComponent(p)}`}
                            className="text-xs text-foreground border border-white/10 bg-white/5 rounded-sm px-2 py-0.5 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer">
                            {p}
                          </Link>
                        ))
                      : <span className="text-sm text-foreground">—</span>
                    }
                  </div>
                </div>

                {/* Genres */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-4 py-3">
                  <span className="text-[10px] text-white/40 uppercase tracking-[0.12em] font-medium pt-0.5">Genre</span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.genre
                      ? product.genre.split(',').map((g) => g.trim()).filter(Boolean).map((g) => (
                          <Link key={g} to={`/all?genre=${encodeURIComponent(g)}`}
                            className="text-xs text-[#C6A355] border border-[#C6A355]/20 bg-[#C6A355]/5 rounded-sm px-2 py-0.5 hover:border-[#C6A355]/60 hover:bg-[#C6A355]/10 transition-colors cursor-pointer">
                            {g}
                          </Link>
                        ))
                      : <span className="text-sm text-foreground">—</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;