import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAppStore, ConditionGrade } from '@/stores/useAppStore';
import { useProductStore } from '@/stores/useProductStore';
import { supabase } from '@/lib/supabase';
import { scoreMatch, sortByRelevance } from '@/lib/searchUtils';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Plus, Trash2, Edit2, Save, X, Upload, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const inputClass = 'w-full bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors';
const labelClass = 'block text-[11px] tracking-[0.18em] text-muted-foreground uppercase mb-2';

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
    heroFontSize, taglineFontSize, subtextFontSize,
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

/* ─── Unified lazy entry point ─── */
const AppearanceAndAccountTab = ({ tab, subTab }: { tab: 'appearance' | 'account'; subTab: number }) => {
  if (tab === 'account') return <AccountTab />;
  return <AppearanceTab subTab={subTab} />;
};

export default AppearanceAndAccountTab;

