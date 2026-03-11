import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAppStore, ConditionGrade } from '@/stores/useAppStore';
import { useProductStore, Product } from '@/stores/useProductStore';
import { supabase } from '@/lib/supabase';

import { GlobalSearch, GlobalSearchSuggestion } from '@/components/GlobalSearch';
import { scoreMatch, sortByRelevance } from '@/lib/searchUtils';
import AdminOverview from '@/pages/AdminOverview';
import {
  LogOut, Plus, Trash2, Edit2, Save, X, LayoutGrid, List,
  Upload, GripVertical, Image as ImageIcon, Home, ChevronRight, Menu,
  FileUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, Table2,
  Eye, EyeOff, SlidersHorizontal,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';


/* ─── Strip Japanese brackets from titles ─── */
const stripBrackets = (s: string) => s.replace(/^[「『【〔《〈]|[」』】〕》〉]$/g, '').trim();


/* ─── Shared input style ─── */
const inputClass =
  'w-full bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors';
const labelClass = 'block text-[11px] tracking-[0.18em] text-muted-foreground uppercase mb-2';

/* =========================================================================
   ADMIN ROOT
   ========================================================================= */
const Admin = () => {
  const app = useAppStore();
  const [tab, setTab] = useState(0);
  const [subTab, setSubTab] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', remember: false });
  const [highlightOrderId, setHighlightOrderId] = useState<string | undefined>();
  const [sessionChecked, setSessionChecked] = useState(false);

  // ตรวจสอบ Supabase session ตอน mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        useAppStore.setState({ isAdminLoggedIn: true });
        useAppStore.getState().fetchOrders();
      }
      setSessionChecked(true);
    });
  }, []);

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app.isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-fade-in">
          <h1 className="font-display text-2xl text-primary text-center mb-8 tracking-[0.2em]">ADMIN</h1>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              className={inputClass}
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={loginForm.remember} onChange={(e) => setLoginForm((f) => ({ ...f, remember: e.target.checked }))} className="accent-primary" />
              Remember me
            </label>
            <button
              onClick={async () => {
                const ok = await app.loginAdmin(loginForm.email, loginForm.password);
                if (!ok) toast.error('Invalid credentials');
                else await useAppStore.getState().fetchOrders();
              }}
              className="w-full py-2.5 text-sm font-medium tracking-wider gold-gradient text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabLabels = ['OVERVIEW', 'ORDERS', 'MY PRODUCTS', 'APPEARANCE', 'ACCOUNT'];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Admin Sidebar ── */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 overflow-y-auto" style={{ animation: 'slideInLeft 0.2s ease' }}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-display text-lg text-primary tracking-widest">ADMIN</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <nav className="p-4 space-y-1">
              {/* HOME — text header at top */}
              <a
                href="/"
                className="block px-3 py-2.5 text-sm tracking-[0.2em] text-muted-foreground hover:text-primary hover:bg-secondary transition-colors mb-3 font-medium"
              >
                HOME
              </a>
              <div className="border-t border-border pt-3 space-y-0.5">
                {[
                  { label: 'OVERVIEW', index: 0 },
                  { label: 'ORDERS', index: 1 },
                  { label: 'MY PRODUCTS', index: 2 },
                ].map(({ label, index }) => (
                  <button
                    key={label}
                    onClick={() => { setTab(index); setSidebarOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm tracking-wider transition-colors ${tab === index ? 'text-primary bg-secondary' : 'text-secondary-foreground hover:text-primary hover:bg-secondary'}`}
                  >
                    {label}
                  </button>
                ))}

                {/* APPEARANCE with submenu */}
                <div>
                  <button
                    onClick={() => { setTab(3); setSidebarOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm tracking-wider transition-colors ${tab === 3 ? 'text-primary bg-secondary' : 'text-secondary-foreground hover:text-primary hover:bg-secondary'}`}
                  >
                    APPEARANCE
                  </button>
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {[
                      'Store Info',
                      'Categories',
                      'Payment Details',
                      'Order Confirmation',
                      'Condition Settings',
                    ].map((sub, i) => (
                      <button
                        key={sub}
                        onClick={() => { setTab(3); setSubTab(i); setSidebarOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] tracking-[0.12em] transition-colors ${
                          tab === 3 && subTab === i ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => { setTab(4); setSidebarOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm tracking-wider transition-colors ${tab === 4 ? 'text-primary bg-secondary' : 'text-secondary-foreground hover:text-primary hover:bg-secondary'}`}
                >
                  ACCOUNT
                </button>
              </div>
            </nav>
          </aside>
        </>
      )}

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors -ml-1">
              <Menu size={20} />
            </button>
            <h1 className="font-display text-lg text-primary tracking-[0.15em]">ADMIN</h1>
          </div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-[10px] tracking-[0.1em] text-muted-foreground ml-8">
            <span>ADMIN</span>
            <ChevronRight size={10} />
            <span className="text-primary/70">{tabLabels[tab]}</span>
          </div>
        </div>
        <button onClick={app.logoutAdmin} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm">
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="p-4 lg:px-8">
        {tab === 0 && <AdminOverview onNavigateToOrders={(orderId) => {
          setTab(1);
          if (orderId) setHighlightOrderId(orderId);
        }} />}
        {tab === 1 && <OrdersTab highlightOrderId={highlightOrderId} onClearHighlight={() => setHighlightOrderId(undefined)} />}
        {tab === 2 && <ProductsTab />}
        {tab === 3 && <AppearanceTab subTab={subTab} />}
        {tab === 4 && <AccountTab />}
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

/* =========================================================================
   ORDERS
   ========================================================================= */
const OrdersTab = ({ highlightOrderId, onClearHighlight }: { highlightOrderId?: string; onClearHighlight?: () => void }) => {
  const { orders, updateOrderStatus, deleteOrder } = useAppStore();
  
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [statusFilter, setStatusFilter] = useState<'Paid' | 'Shipped'>('Paid');

  // Auto-switch to correct tab and scroll to highlighted order
  const highlightRef = useMemo(() => highlightOrderId, [highlightOrderId]);

  // Find the order's status to switch to correct tab
  const highlightedOrder = orders.find((o) => o.id === highlightOrderId);
  // Switch to Shipped tab if the order is Shipped
  useMemo(() => {
    if (highlightedOrder) {
      if (highlightedOrder.status === 'Shipped') setStatusFilter('Shipped');
      else setStatusFilter('Paid');
    }
  }, [highlightedOrder]);

  const filtered = orders.filter((o) => o.status === statusFilter);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, typeof orders> = {};
    filtered.forEach((o) => {
      const date = new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!map[date]) map[date] = [];
      map[date].push(o);
    });
    return Object.entries(map).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filtered]);

  const copyAddress = (o: typeof orders[0]) => {
    const text = `${o.customer.name}\n${o.customer.phone}\n${o.customer.address} ${o.customer.postalCode}`;
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard');
  };

  const OrderCard = ({ order: o }: { order: typeof orders[0] }) => (
    <div
      id={`order-${o.id}`}
      className={`bg-card border p-4 space-y-3 transition-all duration-500 ${
        o.id === highlightRef
          ? 'border-primary/60 ring-1 ring-primary/30 shadow-[0_0_12px_rgba(198,163,85,0.15)]'
          : 'border-border'
      }`}
    >
      {/* Header: Order ID + time + delete */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-primary tracking-wider">{o.id}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {new Date(o.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={() => { if (confirm('Delete this order?')) deleteOrder(o.id); }} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-1.5 border-t border-border pt-3">
        {o.items.map((item) => (
          <div key={item.productId} className="flex justify-between items-start gap-2">
            <div>
              <p className="text-xs text-foreground">{item.title}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{item.productId}</p>
            </div>
            <p className="text-xs text-foreground flex-shrink-0">{item.price.toLocaleString()} THB</p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex justify-between items-center border-t border-border pt-2">
        <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Order Total</p>
        <p className="text-sm font-medium text-primary">{o.total.toLocaleString()} THB</p>
      </div>

      {/* Customer + Copy */}
      <div className="border-t border-border pt-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-foreground">{o.customer.name} · {o.customer.phone}</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{o.customer.address}, {o.customer.postalCode}</p>
        </div>
        <button
          onClick={() => copyAddress(o)}
          className="flex-shrink-0 text-[10px] text-muted-foreground hover:text-primary transition-colors border border-border px-2 py-1 flex items-center gap-1"
        >
          <Upload size={10} /> Copy
        </button>
      </div>

      {/* Status toggle — PAID / SHIPPED only */}
      <div className="flex items-center gap-1 border-t border-border pt-2">
        {(['Paid', 'Shipped'] as const).map((s) => (
          <button
            key={s}
            onClick={() => updateOrderStatus(o.id, s)}
            className={`flex-1 py-1 text-[10px] tracking-[0.15em] transition-colors border ${
              o.status === s
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {o.slipUrl && <img src={o.slipUrl} alt="Slip" className="w-full max-w-[120px] rounded border border-border mt-1" />}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar — view toggle LEFT, status filter + view toggle RIGHT */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Orders</p>
        <div className="flex items-center gap-2">
          {/* Status filter toggle */}
          <div className="inline-flex border border-border bg-secondary/60 text-[11px]">
            <button
              onClick={() => setStatusFilter('Paid')}
              className={`px-4 py-1.5 tracking-[0.15em] transition-colors ${statusFilter === 'Paid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              PAID
            </button>
            <button
              onClick={() => setStatusFilter('Shipped')}
              className={`px-4 py-1.5 tracking-[0.15em] transition-colors ${statusFilter === 'Shipped' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              SHIPPED
            </button>
          </div>
          {/* View toggle */}
          <div className="inline-flex border border-border bg-secondary/60 text-[11px]">
            <button onClick={() => setView('list')} className={`px-2 py-1.5 transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List size={14} /></button>
            <button onClick={() => setView('grid')} className={`px-2 py-1.5 transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><LayoutGrid size={14} /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="font-mono text-[10px] tracking-[0.2em] text-white/20 uppercase">No {statusFilter.toLowerCase()} orders.</p>
      )}

      {/* Grouped by date */}
      {grouped.map(([date, dayOrders]) => (
        <div key={date} className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{date}</p>
            <div className="flex-1 h-px bg-border" />
            <p className="text-[10px] text-muted-foreground">{dayOrders.length} order{dayOrders.length > 1 ? 's' : ''}</p>
          </div>
          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-3'}>
            {dayOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        </div>
      ))}
    </div>
  );
};

/* =========================================================================
   SORTABLE IMAGE ITEM (for product edit)
   ========================================================================= */
interface SortableImageProps {
  id: string;
  src: string;
  index: number;
  isCover: boolean;
  onRemove: () => void;
}

const SortableImage = ({ id, src, index, isCover, onRemove }: SortableImageProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="relative group w-24 h-32 rounded border border-border overflow-hidden bg-secondary flex-shrink-0">
      <img src={src} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
      <div {...attributes} {...listeners} className="absolute top-1 left-1 cursor-grab text-foreground/70 hover:text-foreground bg-background/60 rounded p-0.5">
        <GripVertical size={14} />
      </div>
      {isCover && (
        <span className="absolute bottom-1 left-1 text-[9px] tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
          * Cover
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-background/80 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
};


/* =========================================================================
   BULK UPLOAD
   ========================================================================= */

type BulkUploadRow = {
  id: string;
  title: string;
  price: number;
  condition: string;
  platform: string;
  genre: string;
  language: string;
  releaseDate: string;
  developer: string;
  publisher: string;
  synopsis: string;
  imageFrontFilename: string;
  imageBackFilename: string;
  frontImage?: string;
  backImage?: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

const CSV_COLUMN_MAP: Record<string, keyof BulkUploadRow> = {
  'product name': 'title', 'name': 'title', 'title': 'title',
  'product id': 'id', 'id': 'id', 'sku': 'id',
  'price': 'price',
  'condition': 'condition',
  'platform': 'platform',
  'genre': 'genre',
  'language': 'language',
  'release date': 'releaseDate',
  'developer': 'developer',
  'publisher': 'publisher',
  'description': 'synopsis', 'synopsis': 'synopsis',
  'image front filename': 'imageFrontFilename',
  'front image': 'imageFrontFilename',
  'front': 'imageFrontFilename',
  'image back filename': 'imageBackFilename',
  'back image': 'imageBackFilename',
  'back': 'imageBackFilename',
};

function parseCSV(text: string): BulkUploadRow[] {
  // Strip UTF-8 BOM (\uFEFF) — added automatically by Excel / the autofill tool
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) { cols.push(cur); cur = ''; }
      else cur += c;
    }
    cols.push(cur);
    return cols;
  };

  const headerLine = lines[0];
  const headers = parseRow(headerLine).map((h) => h.trim().toLowerCase().replace(/\s+/g, ' '));

  // Skip formula row if second row starts with '='
  const dataStartIndex = lines[1]?.trim().startsWith('=') ? 2 : 1;

  const rows: BulkUploadRow[] = [];
  for (let li = dataStartIndex; li < lines.length; li++) {
    const cols = parseRow(lines[li]);
    if (cols.every((c) => !c.trim())) continue;
    const row: Partial<BulkUploadRow> = { status: 'pending' };
    headers.forEach((h, i) => {
      const key = CSV_COLUMN_MAP[h];
      if (!key) return;
      const val = cols[i]?.trim() ?? '';
      if (key === 'price') (row as Record<string, unknown>)[key] = parseFloat(val) || 0;
      else (row as Record<string, unknown>)[key] = val;
    });
    if (!row.title) continue;
    row.imageFrontFilename = row.imageFrontFilename ?? '';
    row.imageBackFilename = row.imageBackFilename ?? '';
    rows.push(row as BulkUploadRow);
  }
  return rows;
}

const BulkUploadView = ({ onBack }: { onBack: () => void }) => {
  const { products, addProduct, platforms, genres, addPlatform, addGenre } = useProductStore();

  // Step 1: image files from folder(s)
  const [imageMap, setImageMap] = useState<Map<string, File>>(new Map());
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [imageUploadTotal, setImageUploadTotal] = useState(0);
  const [imageUrlMap, setImageUrlMap] = useState<Map<string, string>>(new Map());
  const [imagesUploaded, setImagesUploaded] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Step 2: CSV
  const [rows, setRows] = useState<BulkUploadRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOverCSV, setDragOverCSV] = useState(false);

  // ── Step 1a: Load image files from folder(s) ──────────────────────────
  const handleImageFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const map = new Map<string, File>();
    files.forEach((f) => {
      // key: lowercase filename only (ignore subfolder path)
      map.set(f.name.toLowerCase().trim(), f);
    });
    setImageMap(map);
    setImagesUploaded(false);
    setImageUrlMap(new Map());
    setImageUploadProgress(0);
    setImageUploadTotal(0);
  };

  // ── Step 1b: Upload all images to Supabase Storage ────────────────────
  const handleUploadImages = async () => {
    if (!imageMap.size) return;
    setUploadingImages(true);
    setImageUploadProgress(0);
    setImageUploadTotal(imageMap.size);
    const urlMap = new Map<string, string>();
    let done = 0;
    const entries = Array.from(imageMap.entries());

    // Upload 5 at a time
    const BATCH = 5;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      await Promise.all(batch.map(async ([key, file]) => {
        try {
          const safeName = file.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[×・–—''""«»]/g, '-')
            .replace(/[^\x00-\x7F]/g, '_')
            .replace(/[^a-zA-Z0-9._\-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
          const path = `products/${safeName}`;
          const url = await useProductStore.getState().uploadImage(file, path);
          if (url) urlMap.set(key, url);
        } catch (err) {
          console.warn(`[Upload] Failed: ${file.name}`, err);
        }
        done++;
        setImageUploadProgress(done);
      }));
    }
    setImageUrlMap(urlMap);
    setImagesUploaded(true);
    setUploadingImages(false);
    toast.success(`อัปโหลดรูปสำเร็จ ${urlMap.size} / ${imageMap.size} ไฟล์`);
  };

  // ── Step 2a: Parse CSV ─────────────────────────────────────────────────
  const handleCSVFile = (file: File) => {
    setDone(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) { toast.error('ไม่พบข้อมูลใน CSV'); return; }
      setRows(parsed);
      toast.success(`พบสินค้า ${parsed.length} รายการ`);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // ── Step 2b: Save products with matched image URLs ─────────────────────
  // Convert base64 dataURL → File object
  const base64ToFile = (dataUrl: string, filename: string): File => {
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], filename, { type: mime });
  };

  // Upload base64 หรือ resolve filename จาก imageUrlMap → Supabase public URL
  const resolveImage = async (value: string, productId: string, side: 'front' | 'back'): Promise<string> => {
    if (!value) return '';
    if (value.startsWith('data:')) {
      // base64 จาก autofill → upload ขึ้น Supabase
      const ext = value.startsWith('data:image/png') ? 'png' : 'jpg';
      const file = base64ToFile(value, `${side}.${ext}`);
      const url = await useProductStore.getState().uploadImage(file, `products/${productId}/${side}.${ext}`);
      return url ?? '';
    }
    // filename → match กับ imageUrlMap จาก Step 1
    const url = imageUrlMap.get(value.toLowerCase().trim()) ?? '';
    if (!url && value) {
      console.warn(`[BulkUpload] Image not matched: "${value}" — upload images first (Step 1)`);
    }
    return url;
  };

  const handleSaveProducts = async () => {
    if (!rows.length) return;
    setUploading(true);
    setDone(false);
    const updatedRows = [...rows];

    const BATCH_SIZE = 10;
    for (let start = 0; start < updatedRows.length; start += BATCH_SIZE) {
      const batch = Array.from(
        { length: Math.min(BATCH_SIZE, updatedRows.length - start) },
        (_, k) => start + k
      );
      await Promise.all(batch.map(async (i) => {
        updatedRows[i] = { ...updatedRows[i], status: 'uploading' };
        setRows([...updatedRows]);
        try {
          const row = updatedRows[i];
          const productId = row.id || `OWA-${String(products.length + i + 1).padStart(3, '0')}`;

          // front + back upload parallel
          const [frontImage, backImage] = await Promise.all([
            resolveImage(row.imageFrontFilename, productId, 'front'),
            resolveImage(row.imageBackFilename, productId, 'back'),
          ]);

          const newProduct: Product = {
            id: productId,
            title: row.title || 'Untitled',
            price: row.price || 0,
            condition: (row.condition as Product['condition']) || 'A',
            platform: row.platform?.trim() || '',
            genre: row.genre?.trim() || '',
            language: row.language || 'Japanese',
            releaseDate: row.releaseDate || '',
            developer: row.developer || '',
            publisher: row.publisher || '',
            synopsis: row.synopsis || '',
            frontImage,
            backImage,
            images: [frontImage, backImage].filter(Boolean),
            statusTag: 'none',
          };

          if (newProduct.platform && !platforms.includes(newProduct.platform)) addPlatform(newProduct.platform);
          if (newProduct.genre && !genres.includes(newProduct.genre)) addGenre(newProduct.genre);
          addProduct(newProduct);
          updatedRows[i] = { ...updatedRows[i], frontImage, backImage, status: 'done' };
        } catch (err) {
          updatedRows[i] = { ...updatedRows[i], status: 'error', error: String(err) };
        }
        setRows([...updatedRows]);
      }));
    }

    setUploading(false);
    setDone(true);
    const doneCount = updatedRows.filter((r) => r.status === 'done').length;
    const errCount = updatedRows.filter((r) => r.status === 'error').length;
    toast.success(`นำเข้าสำเร็จ ${doneCount} รายการ${errCount ? ` (${errCount} error)` : ''}`);
  };

  const doneCount = rows.filter((r) => r.status === 'done').length;
  const errCount = rows.filter((r) => r.status === 'error').length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-sm">← Back</button>
        <h2 className="font-display tracking-wider text-foreground">BULK UPLOAD</h2>
      </div>

      {/* ── STEP 1: Upload Images ── */}
      <div className="border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center font-bold">1</span>
          <p className="text-sm font-medium tracking-wider text-foreground">UPLOAD IMAGE FOLDERS</p>
          {imagesUploaded && <span className="text-[10px] text-green-400 ml-auto">✓ {imageUrlMap.size} files uploaded</span>}
        </div>
        <p className="text-xs text-muted-foreground">เลือกโฟลเดอร์รูป (รองรับหลายโฟลเดอร์ / subfolder) — ชื่อไฟล์ต้องตรงกับ CSV</p>

        <input
          type="file"
          // @ts-ignore
          webkitdirectory=""
          multiple
          accept="image/*"
          onChange={handleImageFolderChange}
          className="w-full text-xs text-muted-foreground bg-background border border-border rounded-sm px-3 py-2 file:mr-3 file:text-xs file:border-0 file:bg-primary file:text-primary-foreground file:rounded file:px-3 file:py-1 file:cursor-pointer"
        />

        {imageMap.size > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">พบรูป <span className="text-foreground">{imageMap.size}</span> ไฟล์</p>
            {uploadingImages && (
              <div className="space-y-1">
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${(imageUploadProgress / imageUploadTotal) * 100}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{imageUploadProgress} / {imageUploadTotal}</p>
              </div>
            )}
            {!uploadingImages && (
              <button
                onClick={handleUploadImages}
                className="gold-gradient text-primary-foreground px-5 py-2 rounded-sm text-xs tracking-wider hover:opacity-90"
              >
                {imagesUploaded ? `Re-upload ${imageMap.size} รูป` : `Upload ${imageMap.size} รูปขึ้น Supabase`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 2: Upload CSV ── */}
      <div className="border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center font-bold">2</span>
          <p className="text-sm font-medium tracking-wider text-foreground">UPLOAD CSV</p>
          {rows.length > 0 && <span className="text-[10px] text-green-400 ml-auto">✓ {rows.length} products parsed</span>}
        </div>
        <p className="text-xs text-muted-foreground">CSV ต้องมีคอลัมน์: Product Name, Product ID, Price, Condition, Platform, Genre, Language, Release Date, Developer, Publisher, Description, Image Front Filename, Image Back Filename</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverCSV(true); }}
          onDragLeave={() => setDragOverCSV(false)}
          onDrop={(e) => { e.preventDefault(); setDragOverCSV(false); const f = e.dataTransfer.files[0]; if (f) handleCSVFile(f); }}
          className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors ${dragOverCSV ? 'border-primary bg-primary/5' : 'border-border'}`}
        >
          <p className="text-xs text-muted-foreground mb-3">Drag & drop CSV หรือ</p>
          <label className="cursor-pointer border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors px-4 py-2 rounded-sm text-xs tracking-wider">
            เลือกไฟล์ CSV
            <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); }} />
          </label>
        </div>

        {/* Preview table */}
        {rows.length > 0 && (
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-3 py-2 text-left text-muted-foreground tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-muted-foreground tracking-wider">ID</th>
                  <th className="px-3 py-2 text-left text-muted-foreground tracking-wider">Title</th>
                  <th className="px-3 py-2 text-left text-muted-foreground tracking-wider">Platform</th>
                  <th className="px-3 py-2 text-left text-muted-foreground tracking-wider">Price</th>
                  <th className="px-3 py-2 text-left text-muted-foreground tracking-wider">Front</th>
                  <th className="px-3 py-2 text-left text-muted-foreground tracking-wider">Back</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isBase64Front = row.imageFrontFilename?.startsWith('data:');
                  const isBase64Back = row.imageBackFilename?.startsWith('data:');
                  const frontMatched = isBase64Front ? true : row.imageFrontFilename ? imageUrlMap.has(row.imageFrontFilename.toLowerCase().trim()) : null;
                  const backMatched = isBase64Back ? true : row.imageBackFilename ? imageUrlMap.has(row.imageBackFilename.toLowerCase().trim()) : null;
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-background/50">
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          row.status === 'done' ? 'bg-green-500/20 text-green-400' :
                          row.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          row.status === 'uploading' ? 'bg-primary/20 text-primary' :
                          'bg-border text-muted-foreground'
                        }`}>{row.status}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{row.id || '—'}</td>
                      <td className="px-3 py-2 text-foreground max-w-[180px] truncate">{row.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.platform}</td>
                      <td className="px-3 py-2 text-foreground">{row.price?.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        {isBase64Front
                          ? <img src={row.imageFrontFilename} className="w-8 h-10 object-cover rounded" />
                          : row.imageFrontFilename
                            ? <span className={`text-[10px] ${frontMatched ? 'text-green-400' : 'text-yellow-500'}`}>
                                {frontMatched ? '✓' : '!'} {row.imageFrontFilename.slice(0, 20)}
                              </span>
                            : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {isBase64Back
                          ? <img src={row.imageBackFilename} className="w-8 h-10 object-cover rounded" />
                          : row.imageBackFilename
                            ? <span className={`text-[10px] ${backMatched ? 'text-green-400' : 'text-yellow-500'}`}>
                                {backMatched ? '✓' : '!'} {row.imageBackFilename.slice(0, 20)}
                              </span>
                            : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Import Button ── */}
      {rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Warning: images in CSV but Step 1 not done */}
          {rows.some((r) => r.imageFrontFilename || r.imageBackFilename) && !imagesUploaded && imageMap.size === 0 && (
            <p className="text-xs text-yellow-500">
              ⚠ CSV มีคอลัมน์รูปภาพ แต่ยังไม่ได้เลือกโฟลเดอร์รูปใน Step 1 — ภาพจะไม่ขึ้นหากข้ามขั้นตอนนี้
            </p>
          )}
          {rows.some((r) => r.imageFrontFilename || r.imageBackFilename) && imageMap.size > 0 && !imagesUploaded && (
            <p className="text-xs text-yellow-500">
              ⚠ เลือกรูปแล้ว แต่ยังไม่ได้กด "Upload รูปขึ้น Supabase" ใน Step 1 — กรุณา upload ก่อน import
            </p>
          )}
          <div className="flex items-center gap-4">
          <button
            onClick={handleSaveProducts}
            disabled={uploading}
            className="gold-gradient text-primary-foreground px-6 py-2.5 rounded-sm text-sm tracking-wider hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? `กำลังนำเข้า...` : `นำเข้า ${rows.length} รายการ`}
          </button>
          {done && (
            <p className="text-xs text-green-400">✓ สำเร็จ {doneCount} รายการ {errCount > 0 && <span className="text-red-400">/ Error {errCount}</span>}</p>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   MY PRODUCTS
   ========================================================================= */
const ProductsTab = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useProductStore();
  const conditionGrades = useAppStore((s) => s.conditionGrades);
  const discountRate = useAppStore((s) => s.discountRate);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product>>({});
  
  const [stockFilter, setStockFilter] = useState<'available' | 'soldout' | 'hidden'>('available');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [addMode, setAddMode] = useState<'none' | 'single' | 'bulk'>('none');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const lastSelectedIndex = useRef<number>(-1);
  const isDragging = useRef(false);
  const dragStartId = useRef<string | null>(null);

  /* Image management */
  const [imageList, setImageList] = useState<{ id: string; src: string }[]>([]);

  const filteredByStock = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (stockFilter === 'hidden') return !!p.hidden;
        if (p.hidden) return false;
        if (stockFilter === 'soldout') return p.statusTag === 'soldOut';
        return p.statusTag !== 'soldOut';
      })
      .filter((p) => {
        if (!q) return true;
        return p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.publisher.toLowerCase().includes(q);
      });
  }, [products, search, stockFilter]);

  /* Multi-select helpers */
  const toggleSelect = useCallback((id: string, index: number, e?: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (e?.shiftKey && lastSelectedIndex.current !== -1) {
        // Shift+click: range select
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        filteredByStock.slice(start, end + 1).forEach((p) => next.add(p.id));
      } else {
        next.has(id) ? next.delete(id) : next.add(id);
        lastSelectedIndex.current = index;
      }
      return next;
    });
  }, []);

  // Shift+Arrow keyboard select
  useEffect(() => {
    if (!selectMode) return;
    const handler = (e: KeyboardEvent) => {
      if (!e.shiftKey || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const newIndex = e.key === 'ArrowDown'
          ? Math.min((lastSelectedIndex.current ?? -1) + 1, filteredByStock.length - 1)
          : Math.max((lastSelectedIndex.current ?? 0) - 1, 0);
        next.add(filteredByStock[newIndex]?.id);
        lastSelectedIndex.current = newIndex;
        return next;
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectMode, filteredByStock]);

  // Drag-to-select handlers
  const handleMouseDown = useCallback((id: string, index: number) => {
    if (!selectMode) return;
    isDragging.current = true;
    dragStartId.current = id;
    lastSelectedIndex.current = index;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [selectMode]);

  const handleMouseEnter = useCallback((id: string, index: number) => {
    if (!selectMode || !isDragging.current) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const startIdx = lastSelectedIndex.current;
      const start = Math.min(startIdx, index);
      const end = Math.max(startIdx, index);
      filteredByStock.slice(start, end + 1).forEach((p) => next.add(p.id));
      return next;
    });
  }, [selectMode, filteredByStock]);

  useEffect(() => {
    const up = () => { isDragging.current = false; dragStartId.current = null; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected product${selectedIds.size > 1 ? 's' : ''}?`)) return;
    selectedIds.forEach((id) => deleteProduct(id));
    setSelectedIds(new Set());
    setSelectMode(false);
    toast.success(`${selectedIds.size} products deleted`);
  }, [selectedIds, deleteProduct]);

  const startNew = () => {
    const newId = 'OWA-' + String(products.length + 1).padStart(3, '0');
    setForm({
      id: newId, title: '', price: 0, condition: 'A', platform: '', genre: '',
      language: 'Japanese', releaseDate: '', developer: '', publisher: '',
      synopsis: '', frontImage: '', backImage: '', statusTag: 'none',
    });
    setImageList([]);
    setEditing('new');
    setAddMode('none');
  };

  const startEdit = (p: Product) => {
    setForm({ ...p, title: stripBrackets(p.title) });
    const imgs: string[] = p.images && p.images.length > 0
      ? p.images
      : [p.frontImage, p.backImage].filter(Boolean);
    setImageList(imgs.map((src, i) => ({ id: `img-${i}-${Date.now()}`, src })));
    setEditing(p.id);
  };

  const handleImageFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageList((prev) => [...prev, { id: `img-${Date.now()}-${Math.random()}`, src: reader.result as string }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImageList((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    if (!form.title || !form.id) { toast.error('Title is required'); return; }

    // Upload any base64 images to Supabase Storage first
    const uploadedImages: string[] = [];
    for (let idx = 0; idx < imageList.length; idx++) {
      const img = imageList[idx];
      if (img.src.startsWith('data:')) {
        try {
          // base64 → File → upload
          const [header, data] = img.src.split(',');
          const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
          const ext = mime.split('/')[1] ?? 'jpg';
          const bytes = atob(data);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          const file = new File([arr], `${form.id}-${idx}.${ext}`, { type: mime });
          const url = await useProductStore.getState().uploadImage(file, `products/${form.id}/${idx}.${ext}`);
          uploadedImages.push(url);
        } catch {
          uploadedImages.push(img.src); // fallback base64
        }
      } else {
        uploadedImages.push(img.src); // already a URL
      }
    }

    const updatedForm = {
      ...form,
      frontImage: uploadedImages[0] || '',
      backImage: uploadedImages[1] || '',
      images: uploadedImages,
    };
    if (editing === 'new') {
      addProduct(updatedForm as Product);
      toast.success('Product added');
    } else {
      updateProduct(editing!, updatedForm);
      toast.success('Product updated');
    }
    setEditing(null);
    setForm({});
    setImageList([]);
  };

  const suggestions: GlobalSearchSuggestion[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const scored = products
      .filter((p) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        label: p.title,
        subtitle: `${p.id} · ${p.platform}`,
        score: scoreMatch(p.title, q),
      }))
      .filter((p) => p.score > 0 || p.id.toLowerCase().includes(q));
    return sortByRelevance(scored).slice(0, 10);
  }, [products, search]);

  /* BULK VIEW — must be after all hooks */
  if (addMode === 'bulk') {
    return <BulkUploadView onBack={() => setAddMode('none')} />;
  }

  /* EDIT FORM */
  if (editing) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-sm text-foreground font-medium tracking-wider">{editing === 'new' ? 'ADD PRODUCT' : 'EDIT PRODUCT'}</h2>
          <button onClick={() => { setEditing(null); setForm({}); setImageList([]); }} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* IMAGE UPLOAD SECTION */}
        <div className="space-y-2">
          <label className={labelClass}>Product Images</label>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
            <SortableContext items={imageList.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-3 flex-wrap">
                {imageList.map((img, idx) => (
                  <SortableImage
                    key={img.id}
                    id={img.id}
                    src={img.src}
                    index={idx}
                    isCover={idx === 0}
                    onRemove={() => setImageList((prev) => prev.filter((i) => i.id !== img.id))}
                  />
                ))}
                {/* Add button */}
                <label className="w-24 h-32 rounded border border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors flex-shrink-0">
                  <Upload size={18} className="text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">Add Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFileUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </SortableContext>
          </DndContext>
          <p className="text-[10px] text-muted-foreground">Drag to reorder. First image is the cover.</p>
        </div>

        {/* FORM FIELDS */}
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Product Name</label>
            <input placeholder="e.g. Final Fantasy VIII" value={form.title || ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Product ID</label>
              <input value={form.id || ''} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} disabled={editing !== 'new'} className={`${inputClass} disabled:opacity-50`} />
            </div>
            <div>
              <label className={labelClass}>Price</label>
              <input type="number" placeholder="0" value={form.price ?? ''} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Condition</label>
              <select value={form.condition || 'A'} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as Product['condition'] }))} className={inputClass}>
                {conditionGrades.map((g) => (
                  <option key={g.id} value={g.code}>{g.code} — {g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.statusTag || 'none'} onChange={(e) => setForm((f) => ({ ...f, statusTag: e.target.value as Product['statusTag'] }))} className={inputClass}>
                <option value="none">Available</option>
                <option value="soldOut">Sold Out</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Platform</label>
              <input placeholder="e.g. PlayStation" value={form.platform || ''} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Genre</label>
              <input placeholder="e.g. RPG" value={form.genre || ''} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Language</label>
              <input value={form.language || ''} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Release Date</label>
              <input placeholder="YYYY-MM-DD" value={form.releaseDate || ''} onChange={(e) => setForm((f) => ({ ...f, releaseDate: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Developer</label>
              <input value={form.developer || ''} onChange={(e) => setForm((f) => ({ ...f, developer: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Publisher</label>
              <input value={form.publisher || ''} onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea placeholder="Synopsis / description" value={form.synopsis || ''} onChange={(e) => setForm((f) => ({ ...f, synopsis: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
          </div>
        </div>

        <button onClick={handleSave} className="w-full py-2.5 text-sm font-medium tracking-wider gold-gradient text-primary-foreground hover:opacity-90 flex items-center justify-center gap-2">
          <Save size={16} /> Save Product
        </button>
      </div>
    );
  }

  /* PRODUCT LIST */
  return (
    <div className="space-y-3">
      {/* ── Row 1: Filter pills + search ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex border border-border text-[11px]">
          <button type="button" onClick={() => setStockFilter('available')}
            className={`px-3 py-1.5 tracking-[0.15em] transition-colors ${stockFilter === 'available' ? 'bg-primary text-primary-foreground' : 'text-white/40 hover:text-white/70'}`}>
            AVAILABLE
          </button>
          <button type="button" onClick={() => setStockFilter('soldout')}
            className={`px-3 py-1.5 tracking-[0.15em] transition-colors border-l border-border ${stockFilter === 'soldout' ? 'bg-primary text-primary-foreground' : 'text-white/40 hover:text-white/70'}`}>
            SOLD OUT
          </button>
          <button type="button" onClick={() => setStockFilter('hidden')}
            className={`flex items-center gap-1.5 px-3 py-1.5 tracking-[0.15em] transition-colors border-l border-border ${stockFilter === 'hidden' ? 'bg-primary text-primary-foreground' : 'text-white/40 hover:text-white/70'}`}>
            <EyeOff size={10} /> HIDDEN
          </button>
        </div>
        <div className="flex-1 min-w-[180px]">
          <GlobalSearch
            value={search}
            onChange={setSearch}
            suggestions={suggestions}
            onSelectSuggestion={(s) => {
              setSearch(s.label);
              const target = products.find((p) => p.id === s.id);
              if (target) { startEdit(target); }
            }}
            placeholder="Search by title, ID, or publisher…"
          />
        </div>
      </div>

      {/* ── Row 2: View toggle + count + actions ── */}
      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="inline-flex border border-border text-[11px]">
          <button type="button" onClick={() => setView('list')}
            className={`px-2 py-1.5 transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-white/40 hover:text-white/70'}`}>
            <List size={14} />
          </button>
          <button type="button" onClick={() => setView('grid')}
            className={`px-2 py-1.5 transition-colors border-l border-border ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-white/40 hover:text-white/70'}`}>
            <LayoutGrid size={14} />
          </button>
        </div>
        {/* Item count */}
        <span className="font-mono text-[10px] tracking-[0.18em] text-white/25 uppercase flex-1">
          {filteredByStock.length} item{filteredByStock.length !== 1 ? 's' : ''}
        </span>
        {/* Select */}
        <button
          type="button"
          onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
          className={`px-3 py-1.5 border text-[11px] tracking-[0.15em] transition-colors ${selectMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-white/40 hover:text-white/70'}`}
        >
          Select
        </button>
        {/* Add dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary/60 bg-primary/10 text-[11px] tracking-[0.15em] text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Plus size={13} /> Add
            <ChevronDown size={11} className={`transition-transform duration-200 ${showAddMenu ? 'rotate-180' : ''}`} />
          </button>
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border border-border shadow-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={() => { setShowAddMenu(false); startNew(); }}
                  className="w-full text-left px-4 py-2.5 text-foreground hover:bg-secondary transition-colors flex items-center gap-2.5"
                >
                  <Plus size={13} className="text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium tracking-wider">SINGLE</p>
                    <p className="text-[10px] text-muted-foreground">Add one product</p>
                  </div>
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => { setShowAddMenu(false); setAddMode('bulk'); }}
                  className="w-full text-left px-4 py-2.5 text-foreground hover:bg-secondary transition-colors flex items-center gap-2.5"
                >
                  <FileUp size={13} className="text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium tracking-wider">BULK</p>
                    <p className="text-[10px] text-muted-foreground">Upload CSV</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Multi-select action bar */}
      {selectMode && filteredByStock.length > 0 && (
        <div className="flex items-center gap-3 p-2.5 bg-card border border-border animate-fade-in">
          <input
            type="checkbox"
            checked={filteredByStock.length > 0 && filteredByStock.every((p) => selectedIds.has(p.id))}
            onChange={() => toggleSelectAll(filteredByStock.map((p) => p.id))}
            className="accent-primary w-4 h-4"
          />
          <span className="text-xs text-muted-foreground flex-1">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1.5 text-xs text-destructive border border-destructive/40 px-3 py-1.5 hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} /> Delete {selectedIds.size}
            </button>
          )}
          <button
            onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {filteredByStock.length === 0 && <p className="text-sm text-muted-foreground mt-2">No products found.</p>}

      {view === 'list' && filteredByStock.map((p, index) => (
        <div
          key={p.id}
          className={`flex items-center gap-3 p-3 bg-card border transition-colors select-none ${selectedIds.has(p.id) ? 'border-primary/60 bg-primary/5' : 'border-border'}`}
          onMouseDown={() => handleMouseDown(p.id, index)}
          onMouseEnter={() => handleMouseEnter(p.id, index)}
        >
          {selectMode && (
            <input
              type="checkbox"
              checked={selectedIds.has(p.id)}
              onChange={(e) => toggleSelect(p.id, index, e as unknown as React.MouseEvent)}
              onClick={(e) => e.stopPropagation()}
              className="accent-primary w-4 h-4 flex-shrink-0"
            />
          )}
          {p.frontImage ? (
            <img
              src={p.frontImage}
              alt={p.title}
              onClick={() => !selectMode && startEdit(p)}
              className={`w-10 h-14 object-cover rounded flex-shrink-0 ${!selectMode ? 'cursor-pointer hover:ring-1 hover:ring-primary transition-all' : ''}`}
            />
          ) : (
            <div className="w-10 h-14 rounded bg-secondary border border-border flex items-center justify-center flex-shrink-0"><ImageIcon size={14} className="text-muted-foreground" /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{stripBrackets(p.title)}</p>
            <p className="text-xs text-muted-foreground">{p.id} · {p.price.toLocaleString()} THB{discountRate > 0 && <span className="ml-1.5 text-[10px] text-primary border border-primary/30 px-1.5 py-0.5 tracking-[0.1em]">-{Math.round(discountRate)}% → {Math.round(p.price * (1 - discountRate / 100)).toLocaleString()}</span>}{p.hidden ? <span className="ml-2 text-[10px] text-white/35 border border-white/12 px-1.5 py-0.5 tracking-[0.1em]">HIDDEN</span> : null}</p>
          </div>
          {!selectMode && (
            <>
              {/* Quick status toggle */}
              <button
                onClick={() => updateProduct(p.id, { statusTag: p.statusTag === 'soldOut' ? 'none' : 'soldOut' })}
                className={`flex items-center gap-1.5 px-2.5 py-1 border text-[10px] tracking-[0.1em] transition-colors flex-shrink-0 ${p.statusTag === 'soldOut' ? 'border-muted-foreground/30 text-muted-foreground' : 'border-green-800/40 text-green-700'}`}
                title="Toggle Available / Sold Out"
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.statusTag === 'soldOut' ? 'border border-muted-foreground/50' : 'bg-green-700'}`} />
                {p.statusTag === 'soldOut' ? 'SOLD OUT' : 'AVAILABLE'}
              </button>
              <button onClick={() => { updateProduct(p.id, { hidden: !p.hidden }); toast.success(p.hidden ? 'Product visible' : 'Product hidden'); }} className={`transition-colors ${p.hidden ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`} title={p.hidden ? 'Show product' : 'Hide product'}>{p.hidden ? <Eye size={16} /> : <EyeOff size={16} />}</button>
              <button onClick={() => startEdit(p)} className="text-muted-foreground hover:text-primary transition-colors"><Edit2 size={16} /></button>
              <button onClick={() => { deleteProduct(p.id); toast.success('Deleted'); }} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
            </>
          )}
        </div>
      ))}

      {view === 'grid' && filteredByStock.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredByStock.map((p, index) => (
            <div
              key={p.id}
              className={`group bg-card border overflow-hidden transition-colors select-none ${selectedIds.has(p.id) ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border'}`}
              onClick={selectMode ? () => toggleSelect(p.id, index) : undefined}
              onMouseDown={() => handleMouseDown(p.id, index)}
              onMouseEnter={() => handleMouseEnter(p.id, index)}
            >
              <div className="relative aspect-[2/3] overflow-hidden bg-secondary">
                {p.frontImage ? (
                  <img src={p.frontImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon size={24} className="text-muted-foreground" /></div>
                )}
                {selectMode && (
                  <div className="absolute top-1.5 left-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-primary w-4 h-4"
                    />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="font-display text-[11px] text-foreground leading-snug line-clamp-2">{stripBrackets(p.title)}</p>
                <p className="text-[10px] text-muted-foreground">{p.id}</p>
                <div className="mt-1 flex items-center justify-between">
                  {discountRate > 0 ? (
                    <div className="flex flex-col">
                      <span className="text-xs text-primary font-medium">{Math.round(p.price * (1 - discountRate / 100)).toLocaleString()} THB</span>
                      <span className="text-[10px] text-muted-foreground line-through">{p.price.toLocaleString()}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-primary font-medium">{p.price.toLocaleString()} THB</span>
                  )}
                  {!selectMode && (
                    <div className="flex gap-1">
                      <button onClick={() => { updateProduct(p.id, { hidden: !p.hidden }); toast.success(p.hidden ? 'Product visible' : 'Product hidden'); }} className={`transition-colors ${p.hidden ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`} title={p.hidden ? 'Show' : 'Hide'}>{p.hidden ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                      <button onClick={() => startEdit(p)} className="text-muted-foreground hover:text-primary"><Edit2 size={12} /></button>
                      <button onClick={() => { deleteProduct(p.id); toast.success('Deleted'); }} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   APPEARANCE (with sub-tabs via sidebar)
   ========================================================================= */
const AppearanceTab = ({ subTab }: { subTab: number }) => {
  return (
    <div>
      {subTab === 0 && <StoreInfoSubTab />}
      {subTab === 1 && <CategoriesSubTab />}
      {subTab === 2 && <PaymentSubTab />}
      {subTab === 3 && <OrderConfirmationSubTab />}
      {subTab === 4 && <ConditionSettingsSubTab />}
    </div>
  );
};

/* ── Store Info ── */
const StoreInfoSubTab = () => {
  const {
    headerName, setHeaderName,
    heroName, setHeroName,
    storeTagline, setStoreTagline,
    storeSubtext, setStoreSubtext,
    logoUrl, setLogoUrl,
    logoSize, setLogoSize,
    heroFontSize, taglineFontSize, subtextFontSize, discountRate,
    setStoreInfo,
  } = useAppStore();

  const [hdrName, setHdrName] = useState(headerName);
  const [heroNameLocal, setHeroNameLocal] = useState(heroName);
  const [tagline, setTagline] = useState(storeTagline);
  const [subtext, setSubtext] = useState(storeSubtext);
  const [size, setSize] = useState(logoSize);
  const [localLogoUrl, setLocalLogoUrl] = useState(logoUrl);
  const [heroFS, setHeroFS] = useState(heroFontSize ?? 36);
  const [taglineFS, setTaglineFS] = useState(taglineFontSize ?? 12);
  const [subtextFS, setSubtextFS] = useState(subtextFontSize ?? 11);
  const [discountEnabled, setDiscountEnabled] = useState((discountRate ?? 0) > 0);
  const [discountFS, setDiscountFS] = useState(discountRate && discountRate > 0 ? discountRate : 20);

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setLocalLogoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    await setStoreInfo({
      headerName: hdrName,
      heroName: heroNameLocal,
      storeTagline: tagline,
      storeSubtext: subtext,
      logoUrl: localLogoUrl,
      logoSize: size,
      heroFontSize: heroFS,
      taglineFontSize: taglineFS,
      subtextFontSize: subtextFS,
      discountRate: discountEnabled ? discountFS : 0,
    });
    toast.success('Store info updated');
  };

  return (
    <div className="max-w-md space-y-5">
      {/* Logo Upload */}
      <div>
        <label className={labelClass}>Store Logo</label>
        <div className="flex items-start gap-4 mb-3">
          {localLogoUrl ? (
            <div className="relative group">
              <img
                src={localLogoUrl}
                alt="Logo"
                style={{ width: size, height: size }}
                className="rounded border border-border object-contain bg-secondary/50"
              />
              <button
                type="button"
                onClick={() => setLocalLogoUrl('')}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-20 h-20 rounded border border-dashed border-border bg-secondary/50 cursor-pointer hover:border-primary transition-colors">
              <Upload size={18} className="text-muted-foreground mb-1" />
              <span className="text-[10px] text-muted-foreground">Upload Logo</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
            </label>
          )}
          {localLogoUrl && (
            <label className="flex flex-col items-center justify-center w-10 h-10 mt-1 rounded border border-dashed border-border bg-secondary/50 cursor-pointer hover:border-primary transition-colors">
              <Upload size={14} className="text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground mt-0.5">Change</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
            </label>
          )}
        </div>
        {localLogoUrl && (
          <div>
            <label className={labelClass}>Logo Size — {size}px</label>
            <input type="range" min={32} max={200} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>32px</span><span>200px</span></div>
          </div>
        )}
      </div>

      {/* Name Settings */}
      <div className="border-t border-border pt-2">
        <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase mb-3">Name Settings</p>
        <div className="mb-3">
          <label className={labelClass}>Header Name <span className="normal-case text-muted-foreground/60">(top bar)</span></label>
          <input value={hdrName} onChange={(e) => setHdrName(e.target.value)} className={inputClass} placeholder="e.g. OWARIN" />
        </div>
        <div>
          <label className={labelClass}>Hero Name <span className="normal-case text-muted-foreground/60">(homepage center)</span></label>
          <input value={heroNameLocal} onChange={(e) => setHeroNameLocal(e.target.value)} className={inputClass} placeholder="e.g. OWARIN" />
        </div>
      </div>

      {/* Tagline */}
      <div>
        <label className={labelClass}>Tagline</label>
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} placeholder="e.g. Retro Game Guidebook Collector" />
      </div>

      {/* Subtext */}
      <div>
        <label className={labelClass}>Subtext</label>
        <textarea value={subtext} onChange={(e) => setSubtext(e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="e.g. Every item is carefully cleaned..." />
      </div>

      {/* Font Sizes */}
      <div className="border-t border-border pt-2 space-y-4">
        <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Font Sizes</p>

        <div>
          <label className={labelClass}>Hero Name Size — {heroFS}px</label>
          <input type="range" min={20} max={72} value={heroFS} onChange={(e) => setHeroFS(Number(e.target.value))} className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>20px</span><span>72px</span></div>
        </div>

        <div>
          <label className={labelClass}>Tagline Size — {taglineFS}px</label>
          <input type="range" min={8} max={24} value={taglineFS} onChange={(e) => setTaglineFS(Number(e.target.value))} className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>8px</span><span>24px</span></div>
        </div>

        <div>
          <label className={labelClass}>Subtext Size — {subtextFS}px</label>
          <input type="range" min={8} max={20} value={subtextFS} onChange={(e) => setSubtextFS(Number(e.target.value))} className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>8px</span><span>20px</span></div>
        </div>

        <div>
          <label className={labelClass}>
            Discount Rate —{' '}
            {discountEnabled
              ? <span className="text-primary">-{discountFS}% ACTIVE</span>
              : <span className="text-white/25">OFF</span>}
          </label>
          {/* Enable/disable toggle */}
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => setDiscountEnabled(v => !v)}
              className={`relative w-10 h-5 transition-colors border ${discountEnabled ? 'bg-primary border-primary' : 'bg-transparent border-white/20'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 transition-transform ${discountEnabled ? 'translate-x-5 bg-[#0c0c0e]' : 'translate-x-0.5 bg-white/30'}`} />
            </button>
            <span className="font-mono text-[10px] tracking-[0.15em] text-white/40">
              {discountEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
          {/* Rate slider — only active when enabled */}
          <div className={discountEnabled ? '' : 'opacity-30 pointer-events-none'}>
            <input type="range" min={1} max={70} value={discountFS} onChange={(e) => setDiscountFS(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[9px] text-white/25">1%</span>
              <span className="font-mono text-[9px] text-primary">{discountFS}% OFF</span>
              <span className="font-mono text-[9px] text-white/25">70%</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>0% (off)</span><span>70%</span></div>
        </div>
      </div>

      {/* Preview */}
      <div className="border border-border rounded p-5 bg-card space-y-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Preview</p>
        <div className="bg-background/50 border border-border rounded px-4 py-2 flex justify-center">
          <span className="font-display text-base tracking-[0.3em] text-primary">{hdrName || 'OWARIN'}</span>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">↑ Header</p>
        <div className="text-center pt-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {localLogoUrl && (
            <div style={{ marginBottom: Math.round(heroFS * 0.4) }}>
              <img src={localLogoUrl} alt="logo" style={{ width: Math.min(size, 60), height: Math.min(size, 60) }} className="object-contain" />
            </div>
          )}
          <p className="font-display text-primary tracking-[0.25em]" style={{ fontSize: Math.min(heroFS, 28) }}>{heroNameLocal || 'OWARIN'}</p>
          <p className="text-muted-foreground tracking-[0.15em] uppercase" style={{ fontSize: Math.min(taglineFS, 13), marginTop: Math.round(heroFS * 0.6) }}>{tagline}</p>
          <p className="text-muted-foreground max-w-xs" style={{ fontSize: Math.min(subtextFS, 11), marginTop: Math.round(taglineFS * 1.5) }}>{subtext}</p>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">↑ Hero</p>
      </div>

      <button onClick={handleSave} className="gold-gradient text-primary-foreground px-6 py-2 rounded text-sm hover:opacity-90">Save</button>
    </div>
  );
};

/* ── Categories ── */
const PLATFORM_WHITELIST = [
  'PlayStation','PlayStation 2','PlayStation 3','PlayStation 4','PlayStation 5',
  'PlayStation Portable','PlayStation Vita',
  'Nintendo 64','Nintendo DS','Nintendo 3DS','Nintendo Switch',
  'Game Boy','Game Boy Advance','Game Boy Color',
  'Super Famicom','Famicom','Nintendo GameCube','Wii','Wii U',
  'Xbox','Xbox 360','Xbox One','Xbox Series X/S',
  'PC','Sega Saturn','Sega Dreamcast','Sega Genesis','Game Gear',
];

type CategoryItem = { value: string; products: Product[] };

/* ── Autocomplete Input ── */
const AutocompleteInput = ({
  value, onChange, onSelect, onEnter, suggestions, placeholder, className,
}: {
  value: string; onChange: (v: string) => void; onSelect: (v: string) => void;
  onEnter?: () => void; suggestions: string[]; placeholder?: string; className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const filtered = useMemo(() =>
    value.trim() ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8) : suggestions.slice(0, 8),
    [value, suggestions]
  );
  return (
    <div className="relative flex-1">
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); setIdx(-1); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, -1)); }
          else if (e.key === 'Enter') { if (idx >= 0 && filtered[idx]) { onSelect(filtered[idx]); setOpen(false); } else onEnter?.(); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder} className={className ?? inputClass} autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-sm shadow-lg overflow-hidden">
          {filtered.map((s, i) => (
            <button key={s} onMouseDown={() => { onSelect(s); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${i === idx ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'}`}
            >{s}</button>
          ))}
        </div>
      )}
    </div>
  );
};

const CategoriesSubTab = () => {
  const { platforms, genres, products, addPlatform, removePlatform, addGenre, removeGenre, updateProduct } = useProductStore();
  const [activeTab, setActiveTab] = useState<'platform' | 'genre'>('platform');
  const [selectedCat, setSelectedCat] = useState('');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [renamingCat, setRenamingCat] = useState('');
  const [renameVal, setRenameVal] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalVal, setModalVal] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // ALL unique platform/genre values from actual product data (not just settings list)
  const allPlatformsFromProducts = useMemo(() => {
    const set = new Set(products.flatMap(p => p.platform.split(/[/,]/).map(s => s.trim()).filter(Boolean)));
    return Array.from(set).sort();
  }, [products]);

  const allGenresFromProducts = useMemo(() => {
    const set = new Set(products.map(p => p.genre.trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const sidebarItems = activeTab === 'platform' ? allPlatformsFromProducts : allGenresFromProducts;

  // Products filtered by selected category + search
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => !p.hidden);
    if (selectedCat) {
      if (activeTab === 'platform') {
        result = result.filter(p => p.platform.split(/[/,]/).map(s => s.trim()).includes(selectedCat));
      } else {
        result = result.filter(p => p.genre.trim() === selectedCat);
      }
    }
    const q = search.trim().toLowerCase();
    if (q) result = result.filter(p => p.title.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q) || p.genre.toLowerCase().includes(q));
    return result;
  }, [products, selectedCat, activeTab, search]);

  const handleRenamePlatform = async (oldVal: string, newVal: string) => {
    const affected = products.filter(p => p.platform.split(/[/,]/).map(s => s.trim()).includes(oldVal));
    await Promise.all(affected.map(p => {
      const updated = p.platform.split(/[/,]/).map(s => s.trim() === oldVal ? newVal : s.trim()).join(' / ');
      return updateProduct(p.id, { platform: updated });
    }));
    // update settings list too
    if (platforms.includes(oldVal)) { await removePlatform(oldVal); await addPlatform(newVal); }
    toast.success(`เปลี่ยน "${oldVal}" → "${newVal}" (${affected.length} เกม)`);
    setSelectedCat(newVal); setRenamingCat('');
  };

  const handleRenameGenre = async (oldVal: string, newVal: string) => {
    const affected = products.filter(p => p.genre.trim() === oldVal);
    await Promise.all(affected.map(p => updateProduct(p.id, { genre: newVal })));
    if (genres.includes(oldVal)) { await removeGenre(oldVal); await addGenre(newVal); }
    toast.success(`เปลี่ยน "${oldVal}" → "${newVal}" (${affected.length} เกม)`);
    setSelectedCat(newVal); setRenamingCat('');
  };

  const handleRename = async () => {
    const trimmed = renameVal.trim();
    if (!trimmed || trimmed === renamingCat) { setRenamingCat(''); return; }
    setRenameSaving(true);
    if (activeTab === 'platform') await handleRenamePlatform(renamingCat, trimmed);
    else await handleRenameGenre(renamingCat, trimmed);
    setRenameSaving(false);
  };

  const handleDelete = async (val: string) => {
    if (!confirm(`ลบ "${val}" ออกจาก settings list?`)) return;
    if (activeTab === 'platform') await removePlatform(val);
    else await removeGenre(val);
    if (selectedCat === val) setSelectedCat('');
    toast.success(`ลบ "${val}" แล้ว`);
  };

  const handleModalSave = async () => {
    if (!modalProduct) return;
    const trimmed = modalVal.trim();
    const cur = activeTab === 'platform' ? modalProduct.platform : modalProduct.genre;
    if (!trimmed || trimmed === cur) { setModalProduct(null); return; }
    setModalSaving(true);
    await updateProduct(modalProduct.id, activeTab === 'platform' ? { platform: trimmed } : { genre: trimmed });
    setModalSaving(false);
    setModalProduct(null);
    toast.success(`อัปเดต "${modalProduct.title}" แล้ว`);
  };

  const unusedPlatforms = PLATFORM_WHITELIST.filter(p => !platforms.includes(p));
  const suggestions = activeTab === 'platform' ? PLATFORM_WHITELIST : genres;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setDrawerOpen(false);
    };
    if (drawerOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [drawerOpen]);

  return (
    <div className="relative" style={{ minHeight: '70vh' }}>

      {/* ── Control bar ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Tab */}
        <div className="flex gap-1 border border-border rounded-full p-0.5">
          {(['platform', 'genre'] as const).map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setSelectedCat(''); setSearch(''); }}
              className={`px-4 py-1 rounded-full text-[11px] tracking-wider transition-colors ${activeTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'platform' ? 'PLATFORMS' : 'GENRES'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, platform, genre..."
            className="w-full bg-secondary border border-border rounded-full px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={11} /></button>}
        </div>

        <p className="text-xs text-muted-foreground ml-auto">{filteredProducts.length} results</p>

        {/* Active filter tag */}
        {selectedCat && (
          <span className="inline-flex items-center gap-1 border border-primary/40 text-primary text-[11px] rounded-full px-2.5 py-0.5">
            {selectedCat}
            <button onClick={() => setSelectedCat('')}><X size={10} /></button>
          </span>
        )}

        {/* Filter button */}
        <button onClick={() => setDrawerOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] tracking-wider transition-colors bg-background/80 backdrop-blur-sm ${selectedCat ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-primary hover:border-primary'}`}>
          <SlidersHorizontal size={12} />
          FILTER
          {selectedCat && <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">1</span>}
        </button>
      </div>

      {/* ── Product grid (ALL products, like AllProducts page) ── */}
      {filteredProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center mt-20">ไม่พบสินค้า</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => { setModalProduct(p); setModalVal(activeTab === 'platform' ? p.platform : p.genre); }}
              className="group border border-border/50 rounded-sm overflow-hidden text-left hover:border-primary transition-colors cursor-pointer">
              <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                {p.frontImage
                  ? <img src={p.frontImage} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center p-2"><span className="text-[9px] text-muted-foreground text-center leading-tight">{p.title}</span></div>
                }
                <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="flex items-center gap-1 text-[11px] text-primary font-medium"><Edit2 size={12} /> แก้ไข</span>
                </div>
              </div>
              <div className="px-1.5 py-1.5">
                <p className="text-[10px] text-foreground truncate leading-tight">{p.title}</p>
                <p className="text-[9px] text-muted-foreground truncate mt-0.5">{activeTab === 'platform' ? p.platform : p.genre}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Add new category ── */}
      <div className="flex gap-2 border-t border-border pt-4 mt-6">
        <AutocompleteInput value={newCat} onChange={setNewCat}
          onSelect={v => setNewCat(v)}
          onEnter={() => { if (newCat.trim()) { activeTab === 'platform' ? addPlatform(newCat.trim()) : addGenre(newCat.trim()); setNewCat(''); } }}
          suggestions={activeTab === 'platform' ? unusedPlatforms : []}
          placeholder={`เพิ่ม ${activeTab === 'platform' ? 'platform' : 'genre'}...`}
        />
        <button onClick={() => { if (newCat.trim()) { activeTab === 'platform' ? addPlatform(newCat.trim()) : addGenre(newCat.trim()); setNewCat(''); } }}
          className="text-primary hover:text-gold-bright flex-shrink-0"><Plus size={18} /></button>
      </div>

      {/* ── Filter Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50" onClick={() => setDrawerOpen(false)} />
          <div ref={drawerRef} className="fixed right-0 top-0 bottom-0 w-72 bg-card border-l border-border z-50 overflow-y-auto flex flex-col"
            style={{ animation: 'slideInRight 0.2s ease' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
                {activeTab === 'platform' ? 'Platforms' : 'Genres'}
              </span>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>

            <div className="flex-1 px-4 py-3 space-y-0.5 overflow-y-auto">
              {/* All */}
              <button onClick={() => { setSelectedCat(''); setDrawerOpen(false); }}
                className={`w-full text-left px-2 py-2 text-[11px] tracking-[0.12em] rounded transition-colors ${!selectedCat ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {!selectedCat && <span className="mr-2">·</span>}ทั้งหมด ({sidebarItems.length})
              </button>

              {sidebarItems.map(val => {
                const count = activeTab === 'platform'
                  ? products.filter(p => p.platform.split(/[/,]/).map(s => s.trim()).includes(val)).length
                  : products.filter(p => p.genre.trim() === val).length;
                const inSettings = activeTab === 'platform' ? platforms.includes(val) : genres.includes(val);

                return (
                  <div key={val} className="group/row rounded">
                    {renamingCat === val ? (
                      <div className="px-2 py-1.5 space-y-2">
                        <AutocompleteInput value={renameVal} onChange={setRenameVal}
                          onSelect={v => setRenameVal(v)} onEnter={handleRename}
                          suggestions={activeTab === 'platform' ? PLATFORM_WHITELIST : genres}
                          className="w-full bg-background border border-primary rounded-sm px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleRename} disabled={renameSaving}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-sm bg-primary text-primary-foreground text-xs hover:opacity-90 disabled:opacity-50">
                            {renameSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            บันทึก
                          </button>
                          <button onClick={() => setRenamingCat('')}
                            className="px-3 py-1.5 rounded-sm border border-border text-xs text-muted-foreground hover:text-foreground">
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center rounded transition-colors hover:bg-secondary/30">
                        <button onClick={() => { setSelectedCat(val); setDrawerOpen(false); }}
                          className={`flex-1 text-left px-2 py-2 text-[11px] tracking-[0.12em] transition-colors ${selectedCat === val ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                          {selectedCat === val && <span className="mr-2">·</span>}
                          {val}
                          <span className="text-muted-foreground/40 ml-1">({count})</span>
                          {!inSettings && <span className="ml-1 text-yellow-500 text-[9px]">⚠</span>}
                        </button>
                        <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button onClick={() => { setRenamingCat(val); setRenameVal(val); }}
                            className="p-1 text-muted-foreground hover:text-primary rounded"><Edit2 size={11} /></button>
                          {inSettings && <button onClick={() => handleDelete(val)}
                            className="p-1 text-muted-foreground hover:text-destructive rounded"><Trash2 size={11} /></button>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-border">
              <button onClick={() => { setSelectedCat(''); setDrawerOpen(false); }}
                className="w-full text-[11px] tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors text-center uppercase">
                Clear filter
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Edit Product Modal ── */}
      {modalProduct && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-xs tracking-wider text-muted-foreground uppercase">แก้ไข {activeTab === 'platform' ? 'Platform' : 'Genre'}</span>
              <button onClick={() => setModalProduct(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              {modalProduct.frontImage && <img src={modalProduct.frontImage} className="w-12 h-16 object-cover rounded-sm flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm text-foreground font-medium leading-tight">{modalProduct.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{activeTab === 'platform' ? 'Platform ปัจจุบัน:' : 'Genre ปัจจุบัน:'}</p>
                <p className="text-[11px] text-primary">{activeTab === 'platform' ? modalProduct.platform : modalProduct.genre}</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2">
              <label className="text-[11px] tracking-wider text-muted-foreground uppercase">{activeTab === 'platform' ? 'Platform ใหม่' : 'Genre ใหม่'}</label>
              <AutocompleteInput value={modalVal} onChange={setModalVal}
                onSelect={v => setModalVal(v)} onEnter={handleModalSave}
                suggestions={suggestions}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              />
              {activeTab === 'platform' && modalVal && !PLATFORM_WHITELIST.includes(modalVal) && (
                <p className="text-[11px] text-yellow-500">⚠ ไม่อยู่ใน whitelist</p>
              )}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={handleModalSave} disabled={modalSaving || !modalVal.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
                {modalSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                บันทึก
              </button>
              <button onClick={() => setModalProduct(null)}
                className="px-4 py-2.5 rounded-sm border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};
/* ── Payment Details ── */
const PaymentSubTab = () => {
  const app = useAppStore();
  const [bank, setBank] = useState({ bankName: app.bankName, bankAccount: app.bankAccount, bankHolder: app.bankHolder });
  const [qr, setQr] = useState(app.qrCodeUrl);
  const [note, setNote] = useState(app.customerNote);
  const [shippingFee, setShippingFee] = useState(app.shippingFee ?? 70);

  const handleQrUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setQr(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-md space-y-5">
      <div>
        <label className={labelClass}>Bank Name</label>
        <input value={bank.bankName} onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Account Number</label>
        <input value={bank.bankAccount} onChange={(e) => setBank((b) => ({ ...b, bankAccount: e.target.value }))} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Account Name</label>
        <input value={bank.bankHolder} onChange={(e) => setBank((b) => ({ ...b, bankHolder: e.target.value }))} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Shipping Fee (THB)</label>
        <input type="number" min={0} value={shippingFee} onChange={(e) => setShippingFee(Number(e.target.value))} className={inputClass} placeholder="70" />
        <p className="text-[10px] text-muted-foreground mt-1">ค่าส่งที่แสดงบนหน้า Checkout และ Order Summary</p>
      </div>
      <div>
        <label className={labelClass}>QR Code</label>
        <div className="flex items-start gap-3">
          {qr && (
            <div className="relative group">
              <img src={qr} alt="QR" className="w-24 h-24 rounded border border-border object-contain bg-secondary" />
              <button
                type="button"
                onClick={() => setQr('')}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          )}
          <label className="flex flex-col items-center justify-center w-24 h-24 rounded border border-dashed border-border bg-secondary/50 cursor-pointer hover:border-primary transition-colors">
            <Upload size={18} className="text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">{qr ? 'Change' : 'Upload'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQrUpload(f); e.target.value = ''; }} />
          </label>
        </div>
      </div>
      <div>
        <label className={labelClass}>Note to Customer (Optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional notes" rows={2} className={`${inputClass} resize-none`} />
        <p className="text-[10px] text-muted-foreground mt-1">If left blank, this note will not appear on the checkout page.</p>
      </div>
      <button onClick={() => { app.setBankInfo(bank); app.setQrCodeUrl(qr); app.setCustomerNote(note); app.setShippingFee(shippingFee); toast.success('Payment details updated'); }} className="gold-gradient text-primary-foreground px-6 py-2 rounded text-sm hover:opacity-90">Save</button>
    </div>
  );
};

/* ── Order Confirmation ── */
const OrderConfirmationSubTab = () => {
  const { thankYouConfig, setThankYouConfig } = useAppStore();
  const [cfg, setCfg] = useState(thankYouConfig);

  return (
    <div className="max-w-md space-y-5">
      <p className="text-xs text-muted-foreground">Customize the thank-you page customers see after placing an order.</p>

      <div>
        <label className={labelClass}>Thank You Text</label>
        <input value={cfg.thankYouText} onChange={(e) => setCfg((c) => ({ ...c, thankYouText: e.target.value }))} className={inputClass} placeholder="THANK YOU" />
      </div>

      <div>
        <label className={labelClass}>Japanese Text</label>
        <input value={cfg.japaneseText} onChange={(e) => setCfg((c) => ({ ...c, japaneseText: e.target.value }))} className={inputClass} placeholder="ありがとうございました" />
      </div>

      <div>
        <label className={labelClass}>Facebook Messenger URL</label>
        <input value={cfg.messengerUrl} onChange={(e) => setCfg((c) => ({ ...c, messengerUrl: e.target.value }))} className={inputClass} placeholder="https://m.me/yourpage" />
      </div>

      <div>
        <label className={labelClass}>Copy Button Text</label>
        <input value={cfg.copyButtonText} onChange={(e) => setCfg((c) => ({ ...c, copyButtonText: e.target.value }))} className={inputClass} placeholder="[ COPY ORDER SUMMARY ]" />
      </div>

      <div>
        <label className={labelClass}>Messenger Button Text</label>
        <input value={cfg.messengerButtonText} onChange={(e) => setCfg((c) => ({ ...c, messengerButtonText: e.target.value }))} className={inputClass} placeholder="[ SEND TO FACEBOOK MESSENGER ]" />
      </div>

      {/* Preview */}
      <div className="border border-border rounded p-5 bg-card space-y-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Preview</p>
        <div className="text-center space-y-1 py-2">
          <p className="tracking-[0.3em] text-sm text-foreground">{cfg.thankYouText}</p>
          <p className="text-[#D4AF37] text-xs tracking-wider">{cfg.japaneseText}</p>
        </div>
        <div className="border-t border-dashed border-border pt-3 space-y-2">
          <button className="w-full border border-border text-muted-foreground py-2 text-[11px] tracking-[0.2em] rounded-sm">
            {cfg.copyButtonText}
          </button>
          <button className="w-full border border-border text-muted-foreground py-2 text-[11px] tracking-[0.2em] rounded-sm">
            {cfg.messengerButtonText}
          </button>
        </div>
      </div>

      <button onClick={() => { setThankYouConfig(cfg); toast.success('Order confirmation updated'); }} className="gold-gradient text-primary-foreground px-6 py-2 rounded text-sm hover:opacity-90">Save</button>
    </div>
  );
};

/* ── Condition Settings ── */
const ConditionSettingsSubTab = () => {
  const { conditionGrades, addConditionGrade, updateConditionGrade, deleteConditionGrade } = useAppStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', description: '' });

  const startNew = () => {
    setForm({ code: '', name: '', description: '' });
    setEditId('new');
  };

  const startEdit = (g: ConditionGrade) => {
    setForm({ code: g.code, name: g.name, description: g.description });
    setEditId(g.id);
  };

  const handleSave = () => {
    if (!form.code || !form.name) { toast.error('Code and name are required'); return; }
    if (editId === 'new') {
      addConditionGrade({ id: `g-${Date.now()}`, ...form });
      toast.success('Grade added');
    } else {
      updateConditionGrade(editId!, form);
      toast.success('Grade updated');
    }
    setEditId(null);
    setForm({ code: '', name: '', description: '' });
  };

  return (
    <div className="max-w-md space-y-4">
      <p className="text-xs text-muted-foreground">Manage product condition grades. These appear in the ( i ) tooltip on the product detail page.</p>

      {conditionGrades.map((g) => (
        <div key={g.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded">
          <div className="w-8 h-8 rounded border border-primary flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">{g.code}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-medium">{g.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>
          </div>
          <button onClick={() => startEdit(g)} className="text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
          <button onClick={() => { deleteConditionGrade(g.id); toast.success('Deleted'); }} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
        </div>
      ))}

      {editId && (
        <div className="space-y-3 p-4 border border-primary/30 rounded bg-card animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Code</label>
              <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. S" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. MINT" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Explain what this grade means…" className={`${inputClass} resize-none`} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="gold-gradient text-primary-foreground px-4 py-1.5 rounded text-sm hover:opacity-90">Save</button>
            <button onClick={() => setEditId(null)} className="text-muted-foreground text-sm hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {!editId && (
        <button onClick={startNew} className="flex items-center gap-2 text-sm text-primary hover:text-gold-bright"><Plus size={16} /> Add Grade</button>
      )}
    </div>
  );
};

/* ── Account ── */
const AccountTab = () => {
  const { setAdminCredentials } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Load current admin email from Supabase auth session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  return (
    <div className="max-w-md space-y-4">
      <div>
        <label className={labelClass}>Admin Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>New Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" className={inputClass} />
      </div>
      <button onClick={() => { if (password) { setAdminCredentials(email, password); toast.success('Credentials updated'); } else { toast.error('Enter a new password'); } }} className="gold-gradient text-primary-foreground px-6 py-2 rounded text-sm hover:opacity-90">Update</button>
    </div>
  );
};

export default Admin;
