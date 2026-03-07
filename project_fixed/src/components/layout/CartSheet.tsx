import { useCartStore } from '@/stores/useCartStore';

import { X, Trash2, ShoppingBag } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const CartSheet = () => {
  const { items, removeItem, getTotal, getShippingCost, clearCart, isCartOpen, closeCart } = useCartStore();
  
  const navigate = useNavigate();

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: isCartOpen ? 'block' : 'none'
    }}>
      {/* Overlay */}
      <div
        onClick={closeCart}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#121212',
          borderLeft: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
        }}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-display uppercase tracking-widest flex items-center gap-2 text-primary font-bold">
            <ShoppingBag size={20} /> Your Cart
          </h2>
          <button onClick={closeCart} className="p-2 text-white/50 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20">
              <ShoppingBag size={64} className="mb-4 opacity-10" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <button onClick={() => clearCart()} className="text-[10px] text-white/40 hover:text-red-500 underline uppercase tracking-widest">
                  Clear All
                </button>
              </div>
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4 pb-4 border-b border-white/5">
                  <img src={item.frontImage} className="w-16 h-20 object-cover rounded border border-white/10" alt={item.title} />
                  <div className="flex flex-col flex-grow justify-center">
                    <h4 className="text-sm font-medium line-clamp-2 text-white">{item.title}</h4>
                    <p className="text-[10px] text-white/40 uppercase mb-2 bg-white/5 px-2 py-0.5 rounded w-fit">{item.platform}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-primary text-sm font-bold">{item.price.toLocaleString()} THB</p>
                      <button onClick={() => removeItem(item.productId)} className="text-white/20 hover:text-red-500 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-white/[0.02] border-t border-white/10 mt-auto">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-white/50">
                <span>Shipping</span>
                <span className="text-white font-medium">{getShippingCost().toLocaleString()} THB</span>
              </div>
              <div className="flex justify-between text-xl font-display text-primary pt-3 border-t border-white/10 font-bold">
                <span className="tracking-widest">TOTAL</span>
                <span>{getTotal().toLocaleString()} THB</span>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-primary text-black py-4 font-bold hover:brightness-110 uppercase tracking-widest rounded shadow-lg shadow-primary/20"
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
