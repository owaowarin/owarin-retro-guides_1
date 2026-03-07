// src/stores/useAppStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface Order {
  id: string;
  items: { productId: string; title: string; price: number; platform: string }[];
  subtotal: number;
  shipping: number;
  total: number;
  customer: { name: string; phone: string; address: string; postalCode: string };
  status: 'Pending' | 'Paid' | 'Shipped';
  slipUrl?: string;
  createdAt: string;
}

export interface ConditionGrade {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface ThankYouConfig {
  thankYouText: string;
  japaneseText: string;
  messengerUrl: string;
  copyButtonText: string;
  messengerButtonText: string;
}

interface AppStore {
  // settings
  storeName: string;
  headerName: string;
  heroName: string;
  storeTagline: string;
  storeSubtext: string;
  logoUrl: string;
  logoSize: number;
  heroFontSize: number;
  taglineFontSize: number;
  subtextFontSize: number;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  qrCodeUrl: string;
  customerNote: string;
  shippingFee: number;
  thankYouText: string;
  thankYouConfig: ThankYouConfig;
  conditionGrades: ConditionGrade[];
  orders: Order[];
  isAdminLoggedIn: boolean;
  loading: boolean;
  // fetch
  fetchSettings: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  // settings setters
  setHeaderName: (name: string) => Promise<void>;
  setHeroName: (name: string) => Promise<void>;
  setStoreName: (name: string) => Promise<void>;
  setStoreTagline: (tagline: string) => Promise<void>;
  setStoreSubtext: (subtext: string) => Promise<void>;
  setLogoUrl: (url: string) => Promise<void>;
  setLogoSize: (size: number) => Promise<void>;
  setStoreInfo: (info: { headerName: string; heroName: string; storeTagline: string; storeSubtext: string; logoUrl: string; logoSize: number; heroFontSize: number; taglineFontSize: number; subtextFontSize: number }) => Promise<void>;
  setBankInfo: (info: { bankName: string; bankAccount: string; bankHolder: string }) => Promise<void>;
  setQrCodeUrl: (url: string) => Promise<void>;
  setCustomerNote: (note: string) => Promise<void>;
  setShippingFee: (fee: number) => Promise<void>;
  setThankYouText: (text: string) => void;
  setThankYouConfig: (config: Partial<ThankYouConfig>) => Promise<void>;
  // orders
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  // auth
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  setAdminCredentials: (email: string, password: string) => Promise<void>;
  // condition grades
  addConditionGrade: (grade: ConditionGrade) => Promise<void>;
  updateConditionGrade: (id: string, grade: Partial<ConditionGrade>) => Promise<void>;
  deleteConditionGrade: (id: string) => Promise<void>;
}

const defaultThankYouConfig: ThankYouConfig = {
  thankYouText: 'THANK YOU',
  japaneseText: 'ありがとうございました',
  messengerUrl: 'https://m.me/owarinstore/',
  copyButtonText: '[ COPY ORDER SUMMARY ]',
  messengerButtonText: '[ SEND TO FACEBOOK MESSENGER ]',
};

// helper: save settings key
async function saveSetting(key: string, value: unknown) {
  await supabase.from('settings').update({ value }).eq('key', key);
}

export const useAppStore = create<AppStore>((set, get) => ({
  storeName: 'OWARIN',
  headerName: 'OWARIN',
  heroName: 'OWARIN',
  storeTagline: 'Retro Game Guidebook Collector',
  storeSubtext: 'Every item is carefully cleaned and wrapped in cellophane for preservation.',
  logoUrl: '',
  logoSize: 80,
  heroFontSize: 36,
  taglineFontSize: 12,
  subtextFontSize: 11,
  bankName: 'KASIKORNBANK',
  bankAccount: '2143623532',
  bankHolder: 'TANANONT ANANNSONGHIRUNN',
  qrCodeUrl: '',
  customerNote: '',
  shippingFee: 70,
  thankYouText: '',
  thankYouConfig: defaultThankYouConfig,
  conditionGrades: [],
  orders: [],
  isAdminLoggedIn: false,
  loading: false,

  fetchSettings: async () => {
    const { data } = await supabase.from('settings').select('key, value');
    if (!data) return;
    const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
    const store = map['store'] ?? {};
    const payment = map['payment'] ?? {};
    const thankYou = map['thankYou'] ?? defaultThankYouConfig;
    set({
      headerName: store.headerName ?? 'OWARIN',
      heroName: store.heroName ?? 'OWARIN',
      storeName: store.storeName ?? 'OWARIN',
      storeTagline: store.storeTagline ?? '',
      storeSubtext: store.storeSubtext ?? '',
      logoUrl: store.logoUrl ?? '',
      logoSize: store.logoSize ?? 80,
      heroFontSize: store.heroFontSize ?? 36,
      taglineFontSize: store.taglineFontSize ?? 12,
      subtextFontSize: store.subtextFontSize ?? 11,
      bankName: payment.bankName ?? '',
      bankAccount: payment.bankAccount ?? '',
      bankHolder: payment.bankHolder ?? '',
      qrCodeUrl: payment.qrCodeUrl ?? '',
      customerNote: payment.customerNote ?? '',
      shippingFee: payment.shippingFee ?? 70,
      thankYouConfig: { ...defaultThankYouConfig, ...thankYou },
      conditionGrades: (map['conditionGrades'] as ConditionGrade[]) ?? [],
    });
  },

  fetchOrders: async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!data) return;
    set({
      orders: data.map((o) => ({
        id: o.id,
        items: o.items,
        subtotal: o.subtotal,
        shipping: o.shipping,
        total: o.total,
        customer: o.customer,
        status: o.status,
        slipUrl: o.slip_url,
        createdAt: o.created_at,
      })),
    });
  },

  setHeaderName: async (name) => {
    set({ headerName: name });
    const s = get();
    await saveSetting('store', { headerName: name, heroName: s.heroName, storeName: s.storeName, storeTagline: s.storeTagline, storeSubtext: s.storeSubtext, logoUrl: s.logoUrl, logoSize: s.logoSize });
  },
  setHeroName: async (name) => {
    set({ heroName: name });
    const s = get();
    await saveSetting('store', { headerName: s.headerName, heroName: name, storeName: s.storeName, storeTagline: s.storeTagline, storeSubtext: s.storeSubtext, logoUrl: s.logoUrl, logoSize: s.logoSize });
  },
  setStoreName: async (name) => {
    set({ storeName: name });
    const s = get();
    await saveSetting('store', { headerName: s.headerName, heroName: s.heroName, storeName: name, storeTagline: s.storeTagline, storeSubtext: s.storeSubtext, logoUrl: s.logoUrl, logoSize: s.logoSize });
  },
  setStoreTagline: async (tagline) => {
    set({ storeTagline: tagline });
    const s = get();
    await saveSetting('store', { headerName: s.headerName, heroName: s.heroName, storeName: s.storeName, storeTagline: tagline, storeSubtext: s.storeSubtext, logoUrl: s.logoUrl, logoSize: s.logoSize });
  },
  setStoreSubtext: async (subtext) => {
    set({ storeSubtext: subtext });
    const s = get();
    await saveSetting('store', { headerName: s.headerName, heroName: s.heroName, storeName: s.storeName, storeTagline: s.storeTagline, storeSubtext: subtext, logoUrl: s.logoUrl, logoSize: s.logoSize });
  },
  setLogoUrl: async (url) => {
    set({ logoUrl: url });
    const s = get();
    await saveSetting('store', { headerName: s.headerName, heroName: s.heroName, storeName: s.storeName, storeTagline: s.storeTagline, storeSubtext: s.storeSubtext, logoUrl: url, logoSize: s.logoSize });
  },
  setLogoSize: async (size) => {
    set({ logoSize: size });
    const s = get();
    await saveSetting('store', { headerName: s.headerName, heroName: s.heroName, storeName: s.storeName, storeTagline: s.storeTagline, storeSubtext: s.storeSubtext, logoUrl: s.logoUrl, logoSize: size });
  },
  setStoreInfo: async (info) => {
    set({ headerName: info.headerName, heroName: info.heroName, storeTagline: info.storeTagline, storeSubtext: info.storeSubtext, logoUrl: info.logoUrl, logoSize: info.logoSize, heroFontSize: info.heroFontSize, taglineFontSize: info.taglineFontSize, subtextFontSize: info.subtextFontSize });
    const s = get();
    await saveSetting('store', { headerName: info.headerName, heroName: info.heroName, storeName: s.storeName, storeTagline: info.storeTagline, storeSubtext: info.storeSubtext, logoUrl: info.logoUrl, logoSize: info.logoSize, heroFontSize: info.heroFontSize, taglineFontSize: info.taglineFontSize, subtextFontSize: info.subtextFontSize });
  },
  setBankInfo: async (info) => {
    set(info);
    const s = get();
    await saveSetting('payment', { ...info, qrCodeUrl: s.qrCodeUrl, customerNote: s.customerNote });
  },
  setQrCodeUrl: async (url) => {
    set({ qrCodeUrl: url });
    const s = get();
    await saveSetting('payment', { bankName: s.bankName, bankAccount: s.bankAccount, bankHolder: s.bankHolder, qrCodeUrl: url, customerNote: s.customerNote });
  },
  setCustomerNote: async (note) => {
    set({ customerNote: note });
    const s = get();
    await saveSetting('payment', { bankName: s.bankName, bankAccount: s.bankAccount, bankHolder: s.bankHolder, qrCodeUrl: s.qrCodeUrl, customerNote: note, shippingFee: s.shippingFee });
  },
  setShippingFee: async (fee) => {
    set({ shippingFee: fee });
    const s = get();
    await saveSetting('payment', { bankName: s.bankName, bankAccount: s.bankAccount, bankHolder: s.bankHolder, qrCodeUrl: s.qrCodeUrl, customerNote: s.customerNote, shippingFee: fee });
  },
  setThankYouText: (text) => set({ thankYouText: text }),
  setThankYouConfig: async (config) => {
    const updated = { ...get().thankYouConfig, ...config };
    set({ thankYouConfig: updated });
    await saveSetting('thankYou', updated);
  },

  addOrder: async (order) => {
    const { data, error } = await supabase.from('orders').insert({
      id: order.id,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      customer: order.customer,
      status: order.status,
      slip_url: order.slipUrl ?? null,
    }).select().single();
    if (!error && data) {
      set((s) => ({ orders: [order, ...s.orders] }));
    }
  },

  updateOrderStatus: async (id, status) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    }));
  },

  deleteOrder: async (id) => {
    await supabase.from('orders').delete().eq('id', id);
    set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
  },

  loginAdmin: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return false;
    set({ isAdminLoggedIn: true });
    return true;
  },

  logoutAdmin: async () => {
    await supabase.auth.signOut();
    set({ isAdminLoggedIn: false });
  },

  setAdminCredentials: async (email, password) => {
    await supabase.auth.updateUser({ email, password });
  },

  addConditionGrade: async (grade) => {
    const updated = [...get().conditionGrades, grade];
    set({ conditionGrades: updated });
    await saveSetting('conditionGrades', updated);
  },
  updateConditionGrade: async (id, updates) => {
    const updated = get().conditionGrades.map((g) => g.id === id ? { ...g, ...updates } : g);
    set({ conditionGrades: updated });
    await saveSetting('conditionGrades', updated);
  },
  deleteConditionGrade: async (id) => {
    const updated = get().conditionGrades.filter((g) => g.id !== id);
    set({ conditionGrades: updated });
    await saveSetting('conditionGrades', updated);
  },
}));
