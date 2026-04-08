import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useProductStore, Product } from '@/stores/useProductStore';
import { supabase } from '@/lib/supabase';
import { scoreMatch, sortByRelevance } from '@/lib/searchUtils';
import { GlobalSearch, GlobalSearchSuggestion } from '@/components/GlobalSearch';
import { Plus, Trash2, Edit2, Save, X, LayoutGrid, List, Upload, GripVertical, Image as ImageIcon, FileUp, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

const inputClass = 'w-full bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors';
const labelClass = 'block text-[11px] tracking-[0.18em] text-muted-foreground uppercase mb-2';

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

  const toggleSelect = useCallback((id: string, index: number, e?: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (e?.shiftKey && lastSelectedIndex.current !== -1) {
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        filteredByStock.slice(start, end + 1).forEach((p) => next.add(p.id));
      } else {
        next.has(id) ? next.delete(id) : next.add(id);
        lastSelectedIndex.current = index;
      }
      return next;
    });
  }, [filteredByStock]);

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

  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected product${selectedIds.size > 1 ? 's' : ''}?`)) return;
    // ✅ Use Promise.all instead of forEach for proper async handling
    await Promise.all(Array.from(selectedIds).map((id) => deleteProduct(id)));
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
  const availableCount = products.filter((p) => !p.hidden && p.statusTag !== 'soldOut').length;
  const soldOutCount   = products.filter((p) => !p.hidden && p.statusTag === 'soldOut').length;
  const hiddenCount    = products.filter((p) => !!p.hidden).length;

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-1">
        {([
          { label: 'AVAILABLE', value: availableCount, filter: 'available' as const, color: 'text-green-600' },
          { label: 'SOLD OUT',  value: soldOutCount,   filter: 'soldout'   as const, color: 'text-muted-foreground' },
          { label: 'HIDDEN',    value: hiddenCount,    filter: 'hidden'    as const, color: 'text-muted-foreground/50' },
        ]).map(({ label, value, filter, color }) => (
          <div key={label}
            className={`border px-4 py-3 cursor-pointer transition-colors ${stockFilter === filter ? 'bg-card border-primary/40' : 'bg-card border-border hover:border-border/80'}`}
            onClick={() => setStockFilter(filter)}>
            <p className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase mb-1">{label}</p>
            <p className={`text-2xl font-light ${color}`}>{value}</p>
          </div>
        ))}
      </div>

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
            <p className="text-sm text-foreground truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground">{p.id} · {p.price.toLocaleString()} THB{p.hidden ? <span className="ml-2 text-[10px] text-white/35 border border-white/12 px-1.5 py-0.5 tracking-[0.1em]">HIDDEN</span> : null}</p>
          </div>
          {!selectMode && (
            <>
              <button onClick={() => updateProduct(p.id, { statusTag: p.statusTag === 'soldOut' ? 'none' : 'soldOut' })}
                className={`flex items-center gap-1.5 px-2.5 py-1 border text-[10px] tracking-[0.1em] transition-colors flex-shrink-0 whitespace-nowrap ${p.statusTag === 'soldOut' ? 'border-border text-muted-foreground/60' : 'border-green-900/30 text-green-600 bg-green-950/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.statusTag === 'soldOut' ? 'border border-muted-foreground/40' : 'bg-green-600'}`} />
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

export default ProductsTab;
