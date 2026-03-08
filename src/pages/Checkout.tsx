import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Copy } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { useAppStore } from '@/stores/useAppStore';
import { useProductStore } from '@/stores/useProductStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';


const Checkout = () => {
  const { items, removeItem, clearCart, getShippingCost, getTotal } = useCartStore();
  const { bankName, bankAccount, bankHolder, qrCodeUrl, customerNote, addOrder } = useAppStore();
  const updateProduct = useProductStore((s) => s.updateProduct);
  const products = useProductStore((s) => s.products);
  const navigate = useNavigate();
  

  const [form, setForm] = useState({ name: '', phone: '', address: '', postalCode: '' });
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const shipping = getShippingCost();
  const total = getTotal();

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address || !form.postalCode) {
      toast.error('Please fill all fields'); return;
    }
    if (items.length === 0) {
      toast.error('Your bag is empty'); return;
    }

    setSubmitting(true);

    // Generate Order ID: OWA-YYYYMMDD-NNNN (sequence จาก Supabase — ไม่ซ้ำข้ามเครื่อง)
    const now = new Date();
    const datePart = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0');

    // นับ order ที่มี prefix วันนี้จาก Supabase
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .like('id', `OWA-${datePart}-%`);
    const seqPart = String((count ?? 0) + 101).padStart(4, '0');
    const orderId = `OWA-${datePart}-${seqPart}`;

    /* Upload slip to Supabase Storage */
    let slipUrl: string | undefined;
    if (slipFile) {
      const ext = slipFile.name.split('.').pop();
      const path = `slips/${orderId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, slipFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(path);
        slipUrl = urlData.publicUrl;
      }
    }

    /* Auto mark product as soldOut on order placed */
    items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        updateProduct(prod.id, { statusTag: 'soldOut' });
      }
    });

    addOrder({
      id: orderId,
      items: items.map((i) => ({ productId: i.productId, title: i.title, price: i.price, platform: i.platform })),
      subtotal, shipping, total,
      customer: form,
      status: 'Paid',
      slipUrl,
      createdAt: new Date().toISOString(),
    });
    clearCart();
    navigate(`/thank-you?orderId=${orderId}`);
  };

  return (
    <div className="min-h-screen bg-background">

      <main className="pt-4 px-4 pb-12 max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 mt-2">
          <ArrowLeft size={16} /> Continue Shopping
        </Link>

        <h1 className="font-display text-2xl text-primary mb-6 tracking-[0.2em]">CHECKOUT</h1>

        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Your bag is empty.</p>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 p-3 bg-card rounded border border-border">
                  <img src={item.frontImage} alt={item.title} className="w-14 h-18 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.platform}</p>
                    <p className="text-[11px] text-muted-foreground">Product ID: {item.productId}</p>
                    <p className="text-sm text-primary mt-1">{item.price.toLocaleString()} THB</p>
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="self-start text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toLocaleString()} THB</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span>{shipping.toLocaleString()} THB</span></div>
              <div className="flex justify-between text-sm font-medium border-t border-border pt-2"><span className="text-foreground">Total</span><span className="text-primary">{total.toLocaleString()} THB</span></div>
            </div>

            <div className="space-y-3 mb-6">
              <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Shipping Details</h2>
              {[
                { key: 'name', label: 'Full Name', type: 'text' },
                { key: 'phone', label: 'Phone Number', type: 'tel' },
                { key: 'address', label: 'Address', type: 'text' },
                { key: 'postalCode', label: 'Postal Code', type: 'text' },
              ].map(({ key, label, type }) => (
                <input
                  key={key}
                  type={type}
                  placeholder={label}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>

            <div className="border-t border-border pt-6 mb-6">
              <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase mb-4">Payment</h2>
              <div className="bg-card border border-border rounded p-4 space-y-2 mb-4">
                <p className="text-sm text-foreground font-medium">{bankName}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-primary font-mono">{bankAccount}</p>
                  <button onClick={() => { navigator.clipboard.writeText(bankAccount); toast.success('Account number copied'); }} className="text-muted-foreground hover:text-primary transition-colors">
                    <Copy size={14} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{bankHolder}</p>
              </div>
              {qrCodeUrl && (
                <div className="flex justify-center mb-4">
                  <img src={qrCodeUrl} alt="QR Payment" className="max-w-[12rem] w-full h-auto rounded border border-border" />
                </div>
              )}
              {/* Customer Note - only show if admin filled it */}
              {customerNote && (
                <div className="bg-card border border-border rounded p-3 mb-4">
                  <p className="text-xs text-muted-foreground">{customerNote}</p>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-[11px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Upload Payment Slip</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-border file:bg-secondary file:text-foreground file:text-xs file:cursor-pointer"
                />
                {slipFile && <p className="text-xs text-primary mt-1">{slipFile.name}</p>}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded text-sm font-medium tracking-wider gold-gradient text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Confirm Payment
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default Checkout;
