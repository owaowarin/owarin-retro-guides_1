import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Copy } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { useAppStore } from '@/stores/useAppStore';
import { useProductStore } from '@/stores/useProductStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const Checkout = () => {
  const { items, removeItem, clearCart, getShippingCost, getTotal } = useCartStore();
  const { bankName, bankAccount, bankHolder, qrCodeUrl, customerNote, addOrder, discountRate } = useAppStore();
  const updateProduct = useProductStore((s) => s.updateProduct);
  const products = useProductStore((s) => s.products);
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', address: '', postalCode: '' });
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((s, i) => s + (discountRate > 0 ? Math.round(i.price * (1 - discountRate / 100)) : i.price), 0);
  const shipping = getShippingCost();
  const total = subtotal + shipping;

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address || !form.postalCode) {
      toast.error('Please fill all fields'); return;
    }
    if (items.length === 0) {
      toast.error('Your bag is empty'); return;
    }
    setSubmitting(true);

    try {
      const now = new Date();
      const datePart = now.getFullYear().toString()
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0');
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .like('id', `OWA-${datePart}-%`);
      const seqPart = String((count ?? 0) + 101).padStart(4, '0');
      const orderId = `OWA-${datePart}-${seqPart}`;

      let slipUrl: string | undefined;
      if (slipFile) {
        const ext = slipFile.name.split('.').pop();
        const path = `slips/${orderId}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, slipFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
          slipUrl = urlData.publicUrl;
        }
      }

      // ✅ Save order to DB FIRST — if this fails we abort before marking products
      await addOrder({
        id: orderId,
        items: items.map((i) => ({ productId: i.productId, title: i.title, price: i.price, platform: i.platform })),
        subtotal, shipping, total,
        customer: form,
        status: 'Paid',
        slipUrl,
        createdAt: new Date().toISOString(),
      });

      // ✅ Only mark sold out AFTER order is confirmed in DB
      await Promise.all(
        items.map((item) => {
          const prod = products.find((p) => p.id === item.productId);
          if (prod) return updateProduct(prod.id, { statusTag: 'soldOut' });
          return Promise.resolve();
        })
      );

      clearCart();
      navigate(`/thank-you?orderId=${orderId}`);
    } catch (err) {
      console.error('[Checkout] Error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      // ✅ Always reset submitting state
      setSubmitting(false);
    }
  };

  const sectionLabel = 'font-mono text-[9px] tracking-[0.28em] uppercase text-[#C4A35B]';
  const inputClass = 'w-full bg-transparent border border-white/8 px-4 py-3 text-sm font-light text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#C4A35B]/50 transition-colors';

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-4 px-5 pb-16 max-w-lg mx-auto">

        {/* Back */}
        <div className="border-b border-white/5 py-3 mb-8">
          <Link
            to="/"
            className="font-mono text-[9px] tracking-[0.22em] uppercase text-white/25 hover:text-white/60 transition-colors"
          >
            ← Continue Shopping
          </Link>
        </div>

        {/* Page title */}
        <div className="flex items-center gap-3 mb-8">
          <span className={sectionLabel}>Checkout</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {items.length === 0 ? (
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/20">Your bag is empty.</p>
        ) : (
          <>
            {/* ── Cart items ── */}
            <div className="space-y-4 mb-8">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4 pb-4 border-b border-white/5">
                  <div className="w-14 flex-shrink-0 aspect-[3/4] overflow-hidden bg-[#111114]">
                    <img src={item.frontImage} alt={item.title} className="w-full h-full object-cover brightness-90" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-[13px] font-light text-white/72 leading-snug mb-1.5">{item.title}</p>
                      <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-white/28 border border-white/8 px-2 py-0.5 inline-block">
                        {item.platform}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col">
                        {discountRate > 0 && (
                          <span className="font-mono text-[9px] text-white/25 line-through lining-nums leading-none">
                            {item.price.toLocaleString()}
                          </span>
                        )}
                        <span className="font-mono text-[12px] font-bold text-[#D4AF37] lining-nums">
                          {(discountRate > 0 ? Math.round(item.price * (1 - discountRate / 100)) : item.price).toLocaleString()}
                          <span className="text-[9px] font-normal text-white/22 ml-1">THB</span>
                        </span>
                      </div>
                      <button onClick={() => removeItem(item.productId)} className="text-white/18 hover:text-white/50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Order summary ── */}
            <div className="border border-white/5 p-4 mb-8 space-y-3">
              <div className="flex justify-between">
                <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-white/28">Subtotal</span>
                <span className="font-mono text-[11px] text-white/50 lining-nums">{subtotal.toLocaleString()} THB</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-white/28">Shipping</span>
                <span className="font-mono text-[11px] text-white/50 lining-nums">{shipping.toLocaleString()} THB</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/5">
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#C4A35B]">Total</span>
                <span className="font-mono text-[15px] font-bold text-[#D4AF37] lining-nums">{total.toLocaleString()} THB</span>
              </div>
            </div>

            {/* ── Shipping details ── */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className={sectionLabel}>Shipping Details</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="space-y-2.5">
                {([
                  { key: 'name', label: 'Full Name', type: 'text' },
                  { key: 'phone', label: 'Phone Number', type: 'tel' },
                  { key: 'address', label: 'Address', type: 'text' },
                  { key: 'postalCode', label: 'Postal Code', type: 'text' },
                ] as { key: keyof typeof form; label: string; type: string }[]).map(({ key, label, type }) => (
                  <input
                    key={key}
                    type={type}
                    placeholder={label}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputClass}
                  />
                ))}
              </div>
            </div>

            {/* ── Payment ── */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className={sectionLabel}>Payment</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <div className="border border-white/6 p-4 mb-4 space-y-2">
                <p className="text-[13px] font-light text-white/65">{bankName}</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[13px] text-[#D4AF37]">{bankAccount}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(bankAccount); toast.success('Copied'); }}
                    className="text-white/22 hover:text-[#C4A35B] transition-colors"
                  >
                    <Copy size={13} />
                  </button>
                </div>
                <p className="font-mono text-[10px] tracking-[0.1em] text-white/28">{bankHolder}</p>
              </div>

              {qrCodeUrl && (
                <div className="flex justify-center mb-4">
                  <img src={qrCodeUrl} alt="QR Payment" className="max-w-[11rem] w-full h-auto border border-white/8" />
                </div>
              )}

              {customerNote && (
                <div className="border border-white/5 p-3 mb-4">
                  <p className="text-[12px] text-white/35 font-light leading-relaxed">{customerNote}</p>
                </div>
              )}

              {/* Slip upload */}
              <div>
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/28 mb-2">Upload Payment Slip</p>
                <label className="block border border-dashed border-white/10 p-4 text-center cursor-pointer hover:border-[#C4A35B]/35 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                  />
                  {slipFile
                    ? <span className="font-mono text-[10px] tracking-[0.1em] text-[#C4A35B]">{slipFile.name}</span>
                    : <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/22">Choose file</span>
                  }
                </label>
              </div>
            </div>

            {/* ── Submit ── */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 font-mono text-[9px] tracking-[0.3em] uppercase border border-[#C4A35B] text-[#C4A35B] hover:bg-[#C4A35B] hover:text-[#0c0c0e] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Confirm Payment'}
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default Checkout;
