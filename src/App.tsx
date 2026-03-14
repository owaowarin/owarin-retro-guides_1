import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import Header from "@/components/layout/Header";
import CartSheet from "@/components/layout/CartSheet";
import MobileSidebar from "@/components/layout/MobileSidebar";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";
import { useProductStore } from "@/stores/useProductStore";
import { useAppStore } from "@/stores/useAppStore";
import { supabase } from "@/lib/supabase";

// ✅ Lazy load heavy pages — ลด initial bundle ~40%
const Admin       = lazy(() => import("./pages/Admin"));
const AllProducts = lazy(() => import("./pages/AllProducts"));
const Checkout    = lazy(() => import("./pages/Checkout"));
const ThankYou    = lazy(() => import("./pages/ThankYou"));

// ✅ QueryClient with smart caching — ลด Supabase calls ซ้ำ
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 นาที
      gcTime:    1000 * 60 * 10, // 10 นาที
      retry: 1,
    },
  },
});

// ✅ Simple fallback spinner — ไม่ต้องใช้ library
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const MainLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} />
      <MobileSidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <main className="pt-[84px]">
        <Outlet />
      </main>
      <CartSheet />
    </div>
  );
};

const App = () => {
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const fetchMeta = useProductStore((s) => s.fetchMeta);
  const fetchSettings = useAppStore((s) => s.fetchSettings);

  useEffect(() => {
    fetchProducts();
    fetchMeta();
    fetchSettings();

    // Realtime: products → re-fetch เมื่อมีการเพิ่ม/แก้ไข/ลบสินค้า
    const productChannel = supabase
      .channel('realtime-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    // Realtime: orders → re-fetch เมื่อมี order ใหม่ (admin เห็นทันที)
    const orderChannel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        useAppStore.getState().fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(orderChannel);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              {/* ✅ Lazy pages wrapped in Suspense */}
              <Route path="/checkout"     element={<Suspense fallback={<PageLoader />}><Checkout /></Suspense>} />
              <Route path="/thank-you"    element={<Suspense fallback={<PageLoader />}><ThankYou /></Suspense>} />
              <Route path="/all-products" element={<Suspense fallback={<PageLoader />}><AllProducts /></Suspense>} />
            </Route>
            <Route path="/admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
