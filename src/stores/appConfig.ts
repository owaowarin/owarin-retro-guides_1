// Shared mutable config to break circular dependency between useCartStore ↔ useAppStore
// useAppStore writes here; useCartStore reads from here (no cross-import needed)
export const appConfig = {
  shippingFee: 70,
};

/**
 * Shipping fee logic (hidden from customer UI)
 * เล่มแรก 50 ฿ / เล่มถัดไป +10 ฿ / สูงสุด 100 ฿
 * 1 เล่ม = 50, 2 = 60, 3 = 70, 4 = 80, 5 = 90, 6+ = 100
 */
export function calcShipping(count: number): number {
  if (count === 0) return 0;
  return Math.min(50 + (count - 1) * 10, 100);
}
