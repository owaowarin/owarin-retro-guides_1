import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import CartSheet from "@/components/layout/CartSheet";
import MobileSidebar from "@/components/layout/MobileSidebar";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import ThankYou from "./pages/ThankYou";
import Admin from "./pages/Admin";
import AllProducts from "./pages/AllProducts";
import NotFound from "./pages/NotFound";
import { useProductStore } from "@/stores/useProductStore";
import { useAppStore } from "@/stores/useAppStore";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient();

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
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/all-products" element={<AllProducts />} />
            </Route>
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
