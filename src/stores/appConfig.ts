// Shared mutable config to break circular dependency between useCartStore ↔ useAppStore
// useAppStore writes here; useCartStore reads from here (no cross-import needed)
export const appConfig = {
  shippingFee: 70,
};
