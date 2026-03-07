import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAppStore } from '@/stores/useAppStore';

interface CartItem {
  productId: string;
  title: string;
  price: number;
  platform: string;
  frontImage: string;
}

interface CartStore {
  items: CartItem[];
  isCartOpen: boolean;           // ✅ เพิ่มตรงนี้
  openCart: () => void;          // ✅ เพิ่มตรงนี้
  closeCart: () => void;         // ✅ เพิ่มตรงนี้
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  toggleItem: (item: CartItem) => void;
  clearCart: () => void;
  getShippingCost: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addItem: (item) => set((s) => {
        if (s.items.find((i) => i.productId === item.productId)) return s;
        return { items: [...s.items, item] };
      }),

      removeItem: (productId) => set((s) => ({
        items: s.items.filter((i) => i.productId !== productId),
      })),

      toggleItem: (item) => set((s) => {
        const isExist = s.items.find((i) => i.productId === item.productId);
        if (isExist) {
          return { items: s.items.filter((i) => i.productId !== item.productId) };
        } else {
          return { items: [...s.items, item] };
        }
      }),

      clearCart: () => set({ items: [] }),

      getShippingCost: () => {
        const count = get().items.length;
        if (count === 0) return 0;
        const fee = useAppStore.getState().shippingFee ?? 70;
        return fee;
      },

      getTotal: () => {
        const subtotal = get().items.reduce((sum, i) => sum + i.price, 0);
        return subtotal + get().getShippingCost();
      },
    }),
    {
      name: 'owarin-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }), // ✅ ไม่ persist isCartOpen (reset ทุกครั้งที่เปิดเว็บ)
    }
  )
);
