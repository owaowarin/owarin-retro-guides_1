import { useCartStore } from '@/stores/useCartStore';
import { useProductStore } from '@/stores/useProductStore';
import { useAppStore } from '@/stores/useAppStore';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const CartSheet = () => {
  const { items, removeItem, getTotal, getShippingCost, clearCart, isCartOpen, closeCart } = useCartStore();
  const products = useProductStore((s) => s.products);
  const discountRate = useAppStore((s) => s.discountRate);
  const navigate = useNavigate();

  // ✅ ตรวจว่ามีสินค้าที่ sold out อยู่ใน cart หรือไม่
  const hasSoldOut = items.some((item) => {
    const p = products.find((p) => p.id === item.productId);
    return p?.statusTag === 'soldOut';
  });

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: isCartOpen ? 'block' : 'none' }}>

      {/* Overlay */}
      <div
        onClick={closeCart}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      />

      {/* Drawer */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        height: '100%', width: '100%', maxWidth: '380px',
        backgroundColor: '#0e0e11',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-[#C4A35B]">
            Your Bag
          </span>
          <button onClick={closeCart} className="text-white/25 hover:text-white/65 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-grow overflow-y-auto px-6 py-5 space-y-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/15 gap-4">
              <ShoppingBag size={40} strokeWidth={1} />
              <p className="font-mono text-[9px] tracking-[0.25em] uppercase">Empty</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => clearCart()}
                  className="font-mono text-[8px] tracking-[0.2em] uppercase text-white/20 hover:text-white/50 transition-colors"
                >
                  Clear all
                </button>
              </div>

              {items.map((item) => {
                const cartProduct = products.find((p) => p.id === item.productId);
                const itemSoldOut = cartProduct?.statusTag === 'soldOut';
                const discountedPrice = discountRate > 0
                  ? Math.round(item.price * (1 - discountRate / 100))
                  : item.price;
                return (
                <div key={item.productId} className="flex gap-4 pb-5 border-b border-white/5">
                  {/* Image */}
                  <div className="w-14 flex-shrink-0 aspect-[3/4] overflow-hidden bg-[#111114] relative">
                    <img
                      src={item.frontImage}
                      className={`w-full h-full object-cover ${itemSoldOut ? 'brightness-[0.42] grayscale-[55%]' : 'brightness-90'}`}
                      alt={item.title}
                    />
                    {itemSoldOut && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-[7px] tracking-[0.3em] uppercase text-[#C4A35B]/80 border border-[#C4A35B]/30 px-1.5 py-1">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-grow justify-between min-w-0">
                    <div>
                      <h4 className={`text-[13px] font-light leading-snug line-clamp-2 mb-1.5 ${itemSoldOut ? 'text-white/35' : 'text-white/75'}`}>
                        {item.title}
                      </h4>
                      <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-white/28 border border-white/8 px-2 py-0.5 inline-block">
                        {item.platform}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col">
                        {discountRate > 0 && (
                          <span className="font-mono text-[9px] text-white/25 line-through lining-nums leading-none">
                            {item.price.toLocaleString()}
                          </span>
                        )}
                        <span className={`font-mono text-[12px] font-bold lining-nums ${itemSoldOut ? 'text-white/25' : 'text-[#D4AF37]'}`}>
                          {discountedPrice.toLocaleString()}
                          <span className="text-[9px] font-normal text-white/22 ml-1">THB</span>
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-white/18 hover:text-white/55 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-white/5">
            <div className="space-y-2.5 mb-5">
              <div className="flex justify-between">
                <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-white/28">Shipping</span>
                <span className="font-mono text-[11px] text-white/55 lining-nums">
                  {getShippingCost().toLocaleString()} THB
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/5">
                <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-[#C4A35B]">Total</span>
                <span className="font-mono text-[15px] font-bold text-[#D4AF37] lining-nums">
                  {getTotal().toLocaleString()} THB
                </span>
              </div>
            </div>

            {/* ✅ แจ้งเตือนเมื่อมีสินค้า sold out */}
            {hasSoldOut && (
              <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-[#C4A35B] text-center mb-3">
                Please remove sold out items
              </p>
            )}
            <button
              onClick={handleCheckout}
              disabled={hasSoldOut}
              className="w-full py-3.5 font-mono text-[9px] tracking-[0.3em] uppercase border border-[#C4A35B] text-[#C4A35B] hover:bg-[#C4A35B] hover:text-[#0c0c0e] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#C4A35B]"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CartSheet;
