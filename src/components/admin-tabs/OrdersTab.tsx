import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useProductStore } from '@/stores/useProductStore';
import { supabase } from '@/lib/supabase';
import { scoreMatch, sortByRelevance } from '@/lib/searchUtils';
import { GlobalSearch, GlobalSearchSuggestion } from '@/components/GlobalSearch';
import { Plus, Trash2, Edit2, Save, X, LayoutGrid, List, CheckCircle2, AlertCircle, Loader2, Table2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const inputClass = 'w-full bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors';
const labelClass = 'block text-[11px] tracking-[0.18em] text-muted-foreground uppercase mb-2';

const OrdersTab = ({ highlightOrderId, onClearHighlight }: { highlightOrderId?: string; onClearHighlight?: () => void }) => {
  const { orders, updateOrderStatus, deleteOrder } = useAppStore();
  
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [statusFilter, setStatusFilter] = useState<'Paid' | 'Shipped'>('Paid');

  // ✅ Use useEffect for side effects, not useMemo
  const highlightedOrder = orders.find((o) => o.id === highlightOrderId);

  useEffect(() => {
    if (highlightedOrder) {
      setStatusFilter(highlightedOrder.status === 'Shipped' ? 'Shipped' : 'Paid');
    }
  }, [highlightedOrder?.id]);

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
        o.id === highlightOrderId
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

export default OrdersTab;
