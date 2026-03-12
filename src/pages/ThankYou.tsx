import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';

const ThankYou = () => {
  const [params] = useSearchParams();
  const orderId = params.get('orderId') || '';
  const orders = useAppStore((s) => s.orders);
  const fetchOrders = useAppStore((s) => s.fetchOrders);
  const headerName = useAppStore((s) => s.headerName);
  const cfg = useAppStore((s) => s.thankYouConfig);
  const order = orders.find((o) => o.id === orderId);

  // If orders not loaded (e.g. page refresh), fetch them
  useEffect(() => {
    if (orderId && orders.length === 0) {
      fetchOrders();
    }
  }, [orderId]);

  const handleCopy = () => {
    if (!order) {
      navigator.clipboard.writeText(orderId);
      toast.success('Order ID copied');
      return;
    }

    const itemLines = order.items
      .map((item, i) => `${i + 1}. ${item.title}\n   ${item.productId}  ${item.price.toLocaleString()} THB`)
      .join('\n');

    const text = [
      `ORDER ID: ${order.id}`,
      ``,
      `[ ORDER DETAILS ]`,
      itemLines,
      ``,
      `ORDER TOTAL: ${order.total.toLocaleString()} THB`,
      ``,
      `[ SHIP TO ]`,
      `ชื่อ:    ${order.customer.name}`,
      `ที่อยู่: ${order.customer.address} ${order.customer.postalCode}`,
      `โทร:    ${order.customer.phone}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleMessenger = () => {
    window.open(cfg.messengerUrl || 'https://m.me/owarinstore/', '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">

        {/* Store name */}
        <p className="text-center font-display tracking-[0.4em] text-primary text-sm mb-8">{headerName}</p>

        {/* Receipt card */}
        <div className="border border-border bg-card rounded-sm overflow-hidden">
          <div className="px-6 py-6 space-y-5">

            {/* Thank you */}
            <div className="text-center space-y-1 pb-2">
              <p className="tracking-[0.3em] text-sm text-foreground">{cfg.thankYouText}</p>
              <p className="text-[#D4AF37] text-xs tracking-wider">{cfg.japaneseText}</p>
            </div>

            <div className="border-t border-dashed border-border" />

            {/* Order ID */}
            {orderId && (
              <p className="text-center font-mono text-xs text-muted-foreground tracking-wider">
                ORDER ID : <span className="text-[#D4AF37]">{orderId}</span>
              </p>
            )}

            <div className="border-t border-dashed border-border" />

            {/* Order Details */}
            {order ? (
              <>
                <p className="font-mono text-[10px] text-muted-foreground tracking-[0.2em]">[ ORDER DETAILS ]</p>
                <div className="space-y-4">
                  {order.items.map((item, i) => (
                    <div key={item.productId}>
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-sm text-foreground leading-snug">{i + 1}. {item.title}</span>
                        <span className="text-sm text-foreground whitespace-nowrap">{item.price.toLocaleString()} THB</span>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground mt-0.5 ml-4">{item.productId}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-border" />

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="tracking-wider">SUBTOTAL</span>
                    <span>{order.subtotal.toLocaleString()} THB</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="tracking-wider">SHIPPING FEE (ส่งด่วน)</span>
                    <span>{order.shipping.toLocaleString()} THB</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-dashed border-border">
                    <span className="text-xs tracking-[0.2em] text-foreground font-medium">TOTAL AMOUNT</span>
                    <span className="text-base font-display text-[#D4AF37]">{order.total.toLocaleString()} THB</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-border" />

                {/* Ship To */}
                <div className="space-y-2">
                  <p className="font-mono text-[10px] text-muted-foreground tracking-[0.2em]">[ SHIP TO ]</p>
                  <div className="space-y-1 text-xs text-foreground">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-12 shrink-0">ชื่อ</span>
                      <span>{order.customer.name} <span className="text-muted-foreground">({headerName})</span></span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-12 shrink-0">ที่อยู่</span>
                      <span>{order.customer.address} {order.customer.postalCode}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-12 shrink-0">โทร</span>
                      <span>{order.customer.phone}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-4">ไม่พบข้อมูล order</p>
            )}

            <div className="border-t border-dashed border-border" />

            {/* Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleCopy}
                className="w-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors py-2.5 text-[11px] tracking-[0.2em] rounded-sm"
              >
                {cfg.copyButtonText}
              </button>
              <button
                onClick={handleMessenger}
                className="w-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors py-2.5 text-[11px] tracking-[0.2em] rounded-sm"
              >
                {cfg.messengerButtonText}
              </button>
              <Link
                to="/"
                className="block w-full text-center text-muted-foreground/50 hover:text-muted-foreground transition-colors py-2 text-[10px] tracking-widest"
              >
                BACK TO STORE
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
