// src/stores/useProductStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type ProductStatusTag = 'soldOut' | 'none';

export interface Product {
  id: string;
  title: string;
  price: number;
  condition: 'S' | 'A' | 'B' | 'C';
  platform: string;
  genre: string;
  language: string;
  releaseDate: string;
  developer: string;
  publisher: string;
  synopsis: string;
  frontImage: string;
  backImage: string;
  images?: string[];
  statusTag?: ProductStatusTag;
  hidden?: boolean;
}

// map camelCase ↔ snake_case
function toRow(p: Product) {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    condition: p.condition,
    platform: p.platform,
    genre: p.genre,
    language: p.language,
    release_date: p.releaseDate,
    developer: p.developer,
    publisher: p.publisher,
    synopsis: p.synopsis,
    front_image: p.frontImage,
    back_image: p.backImage,
    images: p.images ?? [],
    status_tag: p.statusTag ?? 'none',
    hidden: p.hidden ?? false,
  };
}

/* Strip ALL Japanese bracket variants — applied once at data-read level */
const stripBrackets = (s: string): string =>
  (s || '').replace(/^[「『【〔《〈｢》」』】〕》〉｣]/, '')
           .replace(/[」』】〕》〉｣「『【〔《〈｢]$/, '')
           .replace(/^[「『【〔《〈]/, '').replace(/[」』】〕》〉]$/, '')
           .trim();

function fromRow(r: any): Product {
  return {
    id: r.id,
    title: stripBrackets(r.title),
    price: r.price,
    condition: r.condition,
    platform: r.platform,
    genre: r.genre,
    language: r.language,
    releaseDate: r.release_date,
    developer: r.developer,
    publisher: r.publisher,
    synopsis: r.synopsis,
    frontImage: r.front_image,
    backImage: r.back_image,
    images: r.images ?? [],
    statusTag: r.status_tag,
    hidden: r.hidden,
  };
}

interface ProductStore {
  products: Product[];
  platforms: string[];
  genres: string[];
  loading: boolean;
  // fetch
  fetchProducts: () => Promise<void>;
  fetchMeta: () => Promise<void>;
  // crud
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  // meta
  addPlatform: (platform: string) => Promise<void>;
  removePlatform: (platform: string) => Promise<void>;
  addGenre: (genre: string) => Promise<void>;
  removeGenre: (genre: string) => Promise<void>;
  // image upload
  uploadImage: (file: File, path: string) => Promise<string>;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  platforms: [],
  genres: [],
  loading: false,

  fetchProducts: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('title');
    if (!error && data) {
      set({ products: data.map(fromRow) });
    }
    set({ loading: false });
  },

  fetchMeta: async () => {
    const [platforms, genres] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'platforms').single(),
      supabase.from('settings').select('value').eq('key', 'genres').single(),
    ]);
    set({
      platforms: (platforms.data?.value as string[]) ?? [],
      genres: (genres.data?.value as string[]) ?? [],
    });
  },

  addProduct: async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert(toRow(product))
      .select()
      .single();
    if (!error && data) {
      set((s) => ({ products: [...s.products, fromRow(data)] }));
    }
  },

  updateProduct: async (id, updates) => {
    const current = get().products.find((p) => p.id === id);
    if (!current) return;
    const merged = { ...current, ...updates };

    // Optimistic — instant UI, no waiting for network
    set((s) => ({ products: s.products.map((p) => (p.id === id ? merged : p)) }));

    const { data, error } = await supabase
      .from('products')
      .update(toRow(merged))
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      // Confirm with server value (may differ e.g. timestamps)
      set((s) => ({ products: s.products.map((p) => (p.id === id ? fromRow(data) : p)) }));
    } else if (error) {
      // Revert on failure
      set((s) => ({ products: s.products.map((p) => (p.id === id ? current : p)) }));
    }
  },

  deleteProduct: async (id) => {
    // Extract storage path from public URL
    const extractPath = (url?: string): string | null => {
      if (!url) return null;
      try {
        const marker = '/object/public/product-images/';
        const idx = url.indexOf(marker);
        if (idx === -1) return null;
        return decodeURIComponent(url.slice(idx + marker.length));
      } catch {
        return null;
      }
    };

    // Delete images from Storage first
    const product = get().products.find((p) => p.id === id);
    if (product) {
      const imagePaths = [
        ...(product.images ?? []),
        product.frontImage,
        product.backImage,
      ]
        .map(extractPath)
        .filter((p): p is string => !!p);

      const uniquePaths = [...new Set(imagePaths)];
      if (uniquePaths.length > 0) {
        await supabase.storage.from('product-images').remove(uniquePaths);
      }
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    }
  },

  addPlatform: async (platform) => {
    const current = get().platforms;
    if (current.includes(platform)) return;
    const updated = [...current, platform];
    await supabase.from('settings').update({ value: updated }).eq('key', 'platforms');
    set({ platforms: updated });
  },

  removePlatform: async (platform) => {
    const updated = get().platforms.filter((p) => p !== platform);
    await supabase.from('settings').update({ value: updated }).eq('key', 'platforms');
    set({ platforms: updated });
  },

  addGenre: async (genre) => {
    const current = get().genres;
    if (current.includes(genre)) return;
    const updated = [...current, genre];
    await supabase.from('settings').update({ value: updated }).eq('key', 'genres');
    set({ genres: updated });
  },

  removeGenre: async (genre) => {
    const updated = get().genres.filter((g) => g !== genre);
    await supabase.from('settings').update({ value: updated }).eq('key', 'genres');
    set({ genres: updated });
  },

  uploadImage: async (file, path) => {
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  },
}));
