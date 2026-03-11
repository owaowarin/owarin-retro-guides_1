import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Info, ShoppingBag, Check } from 'lucide-react';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';

/* ── Inject Cormorant Garamond once ── */
const injectFont = () => {
  if (document.getElementById('cormorant-font')) return;
  const link = document.createElement('link');
  link.id = 'cormorant-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap';
  document.head.appendChild(link);
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useProductStore((s) => s.products.find((p) => p.id === id && !p.hidden));
  const conditionGrades = useAppStore((s) => s.conditionGrades);
  const { items, addItem } = useCartStore();

  const [showBack, setShowBack] = useState(false);
  const [showConditionTooltip, setShowConditionTooltip] = useState(false);

  useEffect(() => { injectFont(); }, []);

  useEffect(() => {
    if (!id) return;
    supabase.from('product_views').insert({ product_id: id });
  }, [id]);

  const isInCart = items.some((i) => i.productId === id);
  const isSoldOut = product?.statusTag === 'soldOut';


  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/25">Product Not Found</p>
      </div>
    );
  }

  const handleAdd = () => {
    if (!isInCart && !isSoldOut) {
      addItem({
        productId: product.id,
        title: product.title,
        price: product.price,
        platform: product.platform,
        frontImage: product.frontImage,
      });
    }
  };

  const formatReleaseDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const gradeInfo = conditionGrades.find((g) => g.code === product.condition);

  /* ── shared class shortcuts ── */
  const monoLabel = 'font-mono text-[8px] tracking-[0.22em] uppercase text-white/30 pt-0.5';
  const tagBase = 'font-mono text-[9px] tracking-[0.12em] uppercase border px-2.5 py-1 transition-colors duration-150 cursor-pointer no-underline inline-block leading-none';
  const tagDefault = `${tagBase} border-white/10 text-white/40 hover:border-[#C4A35B]/50 hover:text-[#C4A35B]`;
  const tagGold   = `${tagBase} border-[#C4A35B]/25 text-[#C4A35B]/65 hover:border-[#C4A35B]/60 hover:text-[#C4A35B]`;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Back bar ── */}
      <div className="border-b border-white/5 px-6 lg:px-10 py-3">
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
          className="font-mono text-[9px] tracking-[0.22em] uppercase text-white/25 hover:text-white/60 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* ── 2-col layout ── */}
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row">

          {/* ═══ LEFT: Image — sticky on desktop ═══ */}
          <div className="lg:w-[52%] lg:sticky lg:top-[106px] lg:self-start pt-8 pb-8 lg:pr-10">

            <div className="relative aspect-[3/4] overflow-hidden bg-[#111114]">
              <img
                src={showBack ? product.backImage : product.frontImage}
                alt={product.title}
                className={`w-full h-full object-cover transition-all duration-500 hover:scale-[1.025] ${
                  isSoldOut ? 'brightness-[0.45] grayscale-[50%]' : 'brightness-[0.93]'
                }`}
              />
              {isSoldOut && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="font-mono text-[10px] tracking-[0.45em] uppercase text-[#C4A35B]/75 border border-[#C4A35B]/30 px-5 py-2.5">
                    SOLD OUT
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowBack(!showBack)}
              className="mt-2 w-full bg-transparent border border-white/7 text-white/25 font-mono text-[8px] tracking-[0.22em] uppercase py-2.5 hover:border-[#C4A35B]/35 hover:text-[#C4A35B] transition-colors"
            >
              {showBack ? 'Flip to Front' : '⟲ Flip to Back'}
            </button>
          </div>

          {/* ═══ RIGHT: Info ═══ */}
          <div className="lg:w-[48%] lg:border-l lg:border-white/6 pt-8 pb-20 lg:pl-10 flex flex-col">

            {/* Condition */}
            <div className="relative flex items-center gap-3 mb-5">
              <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#C4A35B] border border-[#C4A35B]/30 px-2.5 py-1 leading-none">
                {product.condition}
              </span>
              {gradeInfo && (
                <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-white/22">
                  {gradeInfo.name}
                </span>
              )}
              <button
                onClick={() => setShowConditionTooltip(!showConditionTooltip)}
                className="ml-auto text-white/18 hover:text-[#C4A35B] transition-colors"
              >
                <Info size={12} />
              </button>

              {showConditionTooltip && (
                <div className="absolute top-full right-0 mt-2 z-30 w-72 bg-[#0f0f12] border border-white/8 shadow-2xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-[#C4A35B]">Condition Guide</span>
                    <button onClick={() => setShowConditionTooltip(false)} className="font-mono text-[10px] text-white/20 hover:text-white/50">✕</button>
                  </div>
                  <div className="space-y-3.5">
                    {conditionGrades.map((g) => (
                      <div key={g.id} className={`flex gap-3 transition-opacity ${g.code === product.condition ? 'opacity-100' : 'opacity-30'}`}>
                        <span className="w-6 h-6 border border-[#C4A35B]/35 flex items-center justify-center font-mono text-[10px] text-[#C4A35B] flex-shrink-0">
                          {g.code}
                        </span>
                        <div>
                          <p className="font-mono text-[8px] tracking-[0.15em] uppercase text-white/50 mb-0.5">{g.name}</p>
                          <p className="text-[11px] text-white/28 leading-relaxed">{g.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Title — Cormorant Garamond */}
            <h1
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, lineHeight: 1.1 }}
              className="text-[30px] lg:text-[36px] text-white/88 mb-4 tracking-[0.01em]"
            >
              {product.title}
            </h1>

            {/* Platform tags */}
            {product.platform && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {product.platform.split('/').map((s) => s.trim()).filter(Boolean).map((plat) => (
                  <Link key={plat} to={`/all-products?platform=${encodeURIComponent(plat)}`} className={tagDefault}>
                    {plat}
                  </Link>
                ))}
              </div>
            )}

            {/* Gold accent divider */}
            <div className="w-8 h-px bg-[#C4A35B] opacity-35 mb-6" />

            {/* Price */}
            <div className="flex items-baseline gap-2.5 mb-7">
              <span className="font-mono text-[22px] font-bold text-[#D4AF37] tracking-tight lining-nums">
                {product.price.toLocaleString()}
              </span>
              <span className="font-mono text-[10px] text-white/22 tracking-[0.18em]">THB</span>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleAdd}
              disabled={isInCart || isSoldOut}
              className={`w-full py-4 mb-10 font-mono text-[9px] tracking-[0.3em] uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                isSoldOut
                  ? 'border border-white/7 text-white/13 cursor-not-allowed'
                  : isInCart
                  ? 'border border-white/7 text-white/18 cursor-default'
                  : 'border border-[#C4A35B] text-[#C4A35B] hover:bg-[#C4A35B] hover:text-[#0c0c0e]'
              }`}
            >
              {isSoldOut
                ? 'Sold Out'
                : isInCart
                ? <><Check size={12} /> In Bag</>
                : <><ShoppingBag size={12} /> Add to Cart</>
              }
            </button>

            {/* ── ABOUT ── */}
            <div className="mb-8">
              <SectionHeading>About</SectionHeading>
              <div className="divide-y divide-white/5">

                <MetaRow label="Release">
                  <span className="text-[13px] text-white/52 font-light">{formatReleaseDate(product.releaseDate)}</span>
                </MetaRow>

                <MetaRow label="Language">
                  <span className="text-[13px] text-white/52 font-light">{product.language || '—'}</span>
                </MetaRow>

                {product.developer && (
                  <MetaRow label="Developer">
                    <div className="flex flex-wrap gap-1.5">
                      {product.developer.split(',').map((d) => d.trim()).filter(Boolean).map((d) => (
                        <Link key={d} to={`/all-products?search=${encodeURIComponent(d)}`} className={tagDefault}>{d}</Link>
                      ))}
                    </div>
                  </MetaRow>
                )}

                {product.publisher && (
                  <MetaRow label="Publisher">
                    <div className="flex flex-wrap gap-1.5">
                      {product.publisher.split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
                        <Link key={p} to={`/all-products?publisher=${encodeURIComponent(p)}`} className={tagDefault}>{p}</Link>
                      ))}
                    </div>
                  </MetaRow>
                )}

                {product.genre && (
                  <MetaRow label="Genre">
                    <div className="flex flex-wrap gap-1.5">
                      {product.genre.split(',').map((g) => g.trim()).filter(Boolean).map((g) => (
                        <Link key={g} to={`/all-products?genre=${encodeURIComponent(g)}`} className={tagGold}>{g}</Link>
                      ))}
                    </div>
                  </MetaRow>
                )}

              </div>
            </div>

            {/* ── SYNOPSIS ── */}
            {product.synopsis && (
              <div>
                <SectionHeading>Synopsis</SectionHeading>
                <p className="text-[13.5px] text-white/40 leading-[1.95] font-light tracking-[0.01em]">
                  {product.synopsis}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */
const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-5">
    <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-[#C4A35B]">{children}</span>
    <div className="flex-1 h-px bg-white/6" />
  </div>
);

const MetaRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[82px_1fr] gap-4 py-3 items-start">
    <span className="font-mono text-[8px] tracking-[0.22em] uppercase text-white/28 pt-1">{label}</span>
    <div>{children}</div>
  </div>
);

export default ProductDetail;
