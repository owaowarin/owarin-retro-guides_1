import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAppStore, ConditionGrade } from '@/stores/useAppStore';
import { useProductStore, Product } from '@/stores/useProductStore';
import { supabase } from '@/lib/supabase';

import { GlobalSearch, GlobalSearchSuggestion } from '@/components/GlobalSearch';
import AdminOverview from '@/pages/AdminOverview';
import {
  LogOut, Plus, Trash2, Edit2, Save, X, LayoutGrid, List,
  Upload, GripVertical, Image as ImageIcon, Home, ChevronRight, Menu,
  FileUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, Table2,
  Eye, EyeOff,
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

/* ─── Shared input style ─── */
const inputClass =
  'w-full bg-secondary border border-border rounded px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors';
const labelClass = 'block text-[11px] tracking-[0.15em] text-muted-foreground uppercase mb-1.5';

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
              className="w-full py-2.5 rounded text-sm font-medium tracking-wider gold-gradient text-primary-foreground hover:opacity-90 transition-opacity"
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
                className="block px-3 py-2.5 text-sm tracking-[0.2em] text-muted-foreground hover:text-primary hover:bg-secondary rounded transition-colors mb-3 font-medium"
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
                    className={`w-full text-left px-3 py-2.5 text-sm tracking-wider rounded transition-colors ${tab === index ? 'text-primary bg-secondary' : 'text-secondary-foreground hover:text-primary hover:bg-secondary'}`}
                  >
                    {label}
                  </button>
                ))}

                {/* APPEARANCE with submenu */}
                <div>
                  <button
                    onClick={() => { setTab(3); setSidebarOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm tracking-wider rounded transition-colors ${tab === 3 ? 'text-primary bg-secondary' : 'text-secondary-foreground hover:text-primary hover:bg-secondary'}`}
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
                        className={`w-full text-left px-3 py-1.5 text-[11px] tracking-[0.1em] rounded transition-colors ${
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
                  className={`w-full text-left px-3 py-2.5 text-sm tracking-wider rounded transition-colors ${tab === 4 ? 'text-primary bg-secondary' : 'text-secondary-foreground hover:text-primary hover:bg-secondary'}`}
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
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Shipped'>('Pending');

  // Auto-switch to correct tab and scroll to highlighted order
  const highlightRef = useMemo(() => highlightOrderId, [highlightOrderId]);

  // Find the order's status to switch to correct tab
  const highlightedOrder = orders.find((o) => o.id === highlightOrderId);
  // Switch to Shipped tab if the order is Shipped
  useMemo(() => {
    if (highlightedOrder) {
      if (highlightedOrder.status === 'Shipped') setStatusFilter('Shipped');
      else setStatusFilter('Pending');
    }
  }, [highlightedOrder]);

  const filtered = orders.filter((o) => o.status === statusFilter || (statusFilter === 'Pending' && o.status === 'Paid'));

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
      className={`bg-card border rounded p-4 space-y-3 transition-all duration-500 ${
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
          className="flex-shrink-0 text-[10px] text-muted-foreground hover:text-primary transition-colors border border-border rounded px-2 py-1 flex items-center gap-1"
        >
          <Upload size={10} /> Copy
        </button>
      </div>

      {/* Status toggle */}
      <div className="flex items-center gap-1 border-t border-border pt-2">
        {(['Pending', 'Paid', 'Shipped'] as const).map((s, i, arr) => (
          <button
            key={s}
            onClick={() => updateOrderStatus(o.id, s)}
            className={`flex-1 py-1 text-[10px] tracking-wider rounded transition-colors border ${
              o.status === s
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-muted-foreground hover:border-primary/50'
            } ${i === 0 ? 'rounded-l' : ''} ${i === arr.length - 1 ? 'rounded-r' : ''}`}
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
          <div className="inline-flex rounded-full border border-border bg-secondary/60 text-[11px]">
            <button
              onClick={() => setStatusFilter('Pending')}
              className={`px-4 py-1.5 rounded-full tracking-[0.15em] transition-colors ${statusFilter === 'Pending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              PENDING
            </button>
            <button
              onClick={() => setStatusFilter('Shipped')}
              className={`px-4 py-1.5 rounded-full tracking-[0.15em] transition-colors ${statusFilter === 'Shipped' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              SHIPPED
            </button>
          </div>
          {/* View toggle */}
          <div className="inline-flex rounded-full border border-border bg-secondary/60 text-[11px]">
            <button onClick={() => setView('list')} className={`px-2 py-1.5 rounded-full transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List size={14} /></button>
            <button onClick={() => setView('grid')} className={`px-2 py-1.5 rounded-full transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><LayoutGrid size={14} /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No {statusFilter.toLowerCase()} orders.</p>
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
          const path = `products/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
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
  const handleSaveProducts = async () => {
    if (!rows.length) return;
    setUploading(true);
    setDone(false);
    const updatedRows = [...rows];

    const resolveUrl = (filename: string): string => {
      if (!filename) return '';
      const key = filename.toLowerCase().trim();
      return imageUrlMap.get(key) ?? '';
    };

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
          const frontImage = resolveUrl(row.imageFrontFilename);
          const backImage = resolveUrl(row.imageBackFilename);

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
      <div className="border border-border rounded-sm p-5 space-y-4">
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
            {!imagesUploaded && (
              <button
                onClick={handleUploadImages}
                disabled={uploadingImages}
                className="gold-gradient text-primary-foreground px-5 py-2 rounded-sm text-xs tracking-wider hover:opacity-90 disabled:opacity-50"
              >
                {uploadingImages ? 'กำลัง upload...' : `Upload ${imageMap.size} รูปขึ้น Supabase`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 2: Upload CSV ── */}
      <div className="border border-border rounded-sm p-5 space-y-4">
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
          <div className="overflow-x-auto rounded border border-border">
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
                  const frontMatched = row.imageFrontFilename ? imageUrlMap.has(row.imageFrontFilename.toLowerCase().trim()) : null;
                  const backMatched = row.imageBackFilename ? imageUrlMap.has(row.imageBackFilename.toLowerCase().trim()) : null;
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
                        {row.imageFrontFilename ? (
                          <span className={`text-[10px] ${frontMatched === true ? 'text-green-400' : frontMatched === false ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                            {frontMatched === true ? '✓' : frontMatched === false ? '!' : '—'} {row.imageFrontFilename.slice(0, 20)}
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {row.imageBackFilename ? (
                          <span className={`text-[10px] ${backMatched === true ? 'text-green-400' : backMatched === false ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                            {backMatched === true ? '✓' : backMatched === false ? '!' : '—'} {row.imageBackFilename.slice(0, 20)}
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
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
          {!imagesUploaded && rows.length > 0 && (
            <p className="text-xs text-yellow-500">⚠ ยังไม่ได้ upload รูป — สินค้าจะถูกบันทึกโดยไม่มีรูป</p>
          )}
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
    setForm({ ...p });
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

  const handleSave = () => {
    if (!form.title || !form.id) { toast.error('Title is required'); return; }
    const images = imageList.map((i) => i.src);
    const updatedForm = {
      ...form,
      frontImage: images[0] || '',
      backImage: images[1] || '',
      images,
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
    return products
      .filter((p) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
      .slice(0, 10)
      .map((p) => ({ id: p.id, label: p.title, subtitle: `${p.id} · ${p.platform}` }));
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

        <button onClick={handleSave} className="w-full py-2.5 rounded text-sm font-medium tracking-wider gold-gradient text-primary-foreground hover:opacity-90 flex items-center justify-center gap-2">
          <Save size={16} /> Save Product
        </button>
      </div>
    );
  }

  /* PRODUCT LIST */
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-full border border-border bg-secondary/60 text-[11px] whitespace-nowrap">
            <button type="button" onClick={() => setStockFilter('available')} className={`px-3 py-1.5 rounded-full tracking-[0.15em] transition-colors ${stockFilter === 'available' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>AVAILABLE</button>
            <button type="button" onClick={() => setStockFilter('soldout')} className={`px-3 py-1.5 rounded-full tracking-[0.15em] transition-colors ${stockFilter === 'soldout' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>SOLD OUT</button>
          </div>
          <button type="button" onClick={() => setStockFilter(stockFilter === 'hidden' ? 'available' : 'hidden')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-[11px] tracking-[0.15em] transition-colors ${stockFilter === 'hidden' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/60 text-muted-foreground hover:text-foreground'}`}><EyeOff size={11} />HIDDEN</button>
        </div>
        <div className="flex-1 max-w-md mx-auto">
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
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className="inline-flex rounded-full border border-border bg-secondary/60 text-[11px]">
            <button type="button" onClick={() => setView('list')} className={`px-2 py-1.5 rounded-full transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List size={14} /></button>
            <button type="button" onClick={() => setView('grid')} className={`px-2 py-1.5 rounded-full transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><LayoutGrid size={14} /></button>
          </div>
          {/* Select mode toggle */}
          <button
            type="button"
            onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
            className={`inline-flex items-center px-3 py-1.5 rounded-full border text-[11px] tracking-[0.15em] transition-colors ${selectMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/60 border-border text-muted-foreground hover:text-foreground'}`}
          >
            Select
          </button>
          {/* Add dropdown: SINGLE or BULK */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/60 bg-primary/10 text-[11px] tracking-[0.15em] text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus size={13} /> Add
              <ChevronDown size={11} className={`transition-transform duration-200 ${showAddMenu ? 'rotate-180' : ''}`} />
            </button>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border border-border rounded shadow-lg overflow-hidden min-w-[140px]">
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
      </div>

      {/* Multi-select action bar */}
      {selectMode && filteredByStock.length > 0 && (
        <div className="flex items-center gap-3 p-2.5 bg-card border border-border rounded animate-fade-in">
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
              className="flex items-center gap-1.5 text-xs text-destructive border border-destructive/40 rounded px-3 py-1.5 hover:bg-destructive/10 transition-colors"
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
          className={`flex items-center gap-3 p-3 bg-card border rounded transition-colors select-none ${selectedIds.has(p.id) ? 'border-primary/60 bg-primary/5' : 'border-border'}`}
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
            <img src={p.frontImage} alt={p.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />
          ) : (
            <div className="w-10 h-14 rounded bg-secondary border border-border flex items-center justify-center flex-shrink-0"><ImageIcon size={14} className="text-muted-foreground" /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground">{p.id} · {p.price.toLocaleString()} THB{p.hidden ? <span className="ml-2 text-[10px] text-primary/70 border border-primary/30 rounded px-1.5 py-0.5 tracking-wider">HIDDEN</span> : null}</p>
          </div>
          {!selectMode && (
            <>
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
              className={`group bg-card border rounded overflow-hidden transition-colors select-none ${selectedIds.has(p.id) ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border'}`}
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
                <p className="font-display text-[11px] text-foreground leading-snug line-clamp-2">{p.title}</p>
                <p className="text-[10px] text-muted-foreground">{p.id}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-primary font-medium">{p.price.toLocaleString()} THB</span>
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
    setStoreInfo,
  } = useAppStore();

  const [hdrName, setHdrName] = useState(headerName);
  const [heroNameLocal, setHeroNameLocal] = useState(heroName);
  const [tagline, setTagline] = useState(storeTagline);
  const [subtext, setSubtext] = useState(storeSubtext);
  const [size, setSize] = useState(logoSize);
  const [localLogoUrl, setLocalLogoUrl] = useState(logoUrl);

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
            <input
              type="range"
              min={32}
              max={200}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>32px</span><span>200px</span>
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-border pt-2">
        <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase mb-3">Name Settings</p>

        {/* Header Name */}
        <div className="mb-3">
          <label className={labelClass}>Header Name <span className="normal-case text-muted-foreground/60">(top bar)</span></label>
          <input value={hdrName} onChange={(e) => setHdrName(e.target.value)} className={inputClass} placeholder="e.g. OWARIN" />
        </div>

        {/* Hero Name */}
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
        <textarea
          value={subtext}
          onChange={(e) => setSubtext(e.target.value)}
          rows={2}
          className={`${inputClass} resize-none`}
          placeholder="e.g. Every item is carefully cleaned..."
        />
      </div>

      {/* Preview */}
      <div className="border border-border rounded p-5 bg-card space-y-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Preview</p>
        {/* Header preview */}
        <div className="bg-background/50 border border-border rounded px-4 py-2 flex justify-center">
          <span className="font-display text-base tracking-[0.3em] text-primary">{hdrName || 'OWARIN'}</span>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">↑ Header</p>
        {/* Hero preview */}
        <div className="text-center space-y-1 pt-2">
          {localLogoUrl && (
            <div className="flex justify-center mb-2">
              <img src={localLogoUrl} alt="logo" style={{ width: Math.min(size, 60), height: Math.min(size, 60) }} className="object-contain" />
            </div>
          )}
          <p className="font-display text-xl text-primary tracking-[0.25em]">{heroNameLocal || 'OWARIN'}</p>
          <p className="text-[11px] text-muted-foreground tracking-[0.15em] uppercase">{tagline}</p>
          <p className="text-[10px] text-muted-foreground">{subtext}</p>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">↑ Hero</p>
      </div>

      <button onClick={handleSave} className="gold-gradient text-primary-foreground px-6 py-2 rounded text-sm hover:opacity-90">Save</button>
    </div>
  );
};


/* ── Categories ── */
const CategoriesSubTab = () => {
  const { platforms, genres, addPlatform, removePlatform, addGenre, removeGenre } = useProductStore();
  const [newPlatform, setNewPlatform] = useState('');
  const [newGenre, setNewGenre] = useState('');

  return (
    <div className="max-w-md space-y-6">
      <div>
        <label className={labelClass}>Platforms</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {platforms.map((p) => (
            <span key={p} className="flex items-center gap-1 bg-secondary border border-border rounded px-2.5 py-1 text-xs text-foreground">
              {p}
              <button onClick={() => removePlatform(p)} className="text-muted-foreground hover:text-destructive"><X size={12} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} placeholder="Add platform" className={inputClass} />
          <button onClick={() => { if (newPlatform) { addPlatform(newPlatform); setNewPlatform(''); } }} className="text-primary hover:text-gold-bright"><Plus size={18} /></button>
        </div>
      </div>
      <div>
        <label className={labelClass}>Genres</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {genres.map((g) => (
            <span key={g} className="flex items-center gap-1 bg-secondary border border-border rounded px-2.5 py-1 text-xs text-foreground">
              {g}
              <button onClick={() => removeGenre(g)} className="text-muted-foreground hover:text-destructive"><X size={12} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newGenre} onChange={(e) => setNewGenre(e.target.value)} placeholder="Add genre" className={inputClass} />
          <button onClick={() => { if (newGenre) { addGenre(newGenre); setNewGenre(''); } }} className="text-primary hover:text-gold-bright"><Plus size={18} /></button>
        </div>
      </div>
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
  const { adminEmail, setAdminCredentials } = useAppStore();
  const [email, setEmail] = useState(adminEmail);
  const [password, setPassword] = useState('');
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
