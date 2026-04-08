import { useEffect, useState, Suspense, lazy } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/lib/supabase';
import AdminOverview from '@/pages/AdminOverview';
import {
  LogOut, X, ChevronRight, Menu,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── Lazy-loaded tab components ─── */
const OrdersTab = lazy(() => import('@/pages/admin-tabs/OrdersTab'));
const ProductsTab = lazy(() => import('@/pages/admin-tabs/ProductsTab'));
const AppearanceAndAccountTab = lazy(() => import('@/pages/admin-tabs/AppearanceTab'));

/* ─── Shared input style ─── */
const inputClass =
  'w-full bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors';

/* ─── Tab loading fallback ─── */
const TabSpinner = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

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
        <Suspense fallback={<TabSpinner />}>
          {tab === 1 && <OrdersTab highlightOrderId={highlightOrderId} onClearHighlight={() => setHighlightOrderId(undefined)} />}
          {tab === 2 && <ProductsTab />}
          {tab === 3 && <AppearanceAndAccountTab tab="appearance" subTab={subTab} />}
          {tab === 4 && <AppearanceAndAccountTab tab="account" subTab={subTab} />}
        </Suspense>
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


export default Admin;
