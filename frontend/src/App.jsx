// src/App.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";

import Header from "./components/Header";
import Home from "./pages/Home";
import StoreLocator from "./pages/StoreLocator";
import WarrantyPolicy from "./pages/WarrantyPolicy";
import BackToSchool from "./pages/BackToSchool";
import ProductDetail from "./pages/ProductDetail";
import AdminDashboard from "./admin/AdminDashboard";
import OrderManagement from "./admin/OrderManagement";
import Loading from "./components/Loading";
import Cart from "./pages/Cart";
import MyOrders from "./pages/MyOrders";
import Payment from "./pages/Payment";
import Search from "./pages/Search";
import Footer from "./components/Footer";

/* ================== helpers (pure) ================== */
const normalizeRole = (r) =>
  String(r || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase(); // 'khachhang' | 'nhanvien' | 'admin' | 'staff'

const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem("user")) || null; }
  catch { return null; }
};

const isStaff = (user) => {
  if (!user) return false;
  // Ưu tiên cờ server
  if (user.isAdmin === true || user.isAdmin === 1 || user.isAdmin === "1") return true;
  // Fallback theo role (CSDL: 'NhanVien' → staff)
  const role = normalizeRole(user.role || user.type || user.VaiTro);
  return role === "nhanvien" || role === "admin" || role === "staff";
};

function RequireStaff({ children }) {
  const user = getStoredUser();
  return isStaff(user) ? children : <Navigate to="/" replace />;
}

/* ===== Auto route: nếu đã đăng nhập là nhân viên → vào /admin; ngược lại → Home */
function HomeOrAdmin() {
  const user = getStoredUser();
  if (isStaff(user)) return <Navigate to="/admin" replace />;
  return <Home />;
}

/* ============ ToastRoot: nghe sự kiện app-toast và hiển thị toast toàn cục ============ */
function ToastRoot() {
  const [toast, setToast] = useState(null); // {type:'success'|'error', text:'', ms:number}

  useEffect(() => {
    const onToast = (e) => {
      const { type = "info", text = "", ms = 2500 } = e.detail || {};
      setToast({ type, text });
      const t = setTimeout(() => setToast(null), ms);
      return () => clearTimeout(t);
    };
    window.addEventListener("app-toast", onToast);
    return () => window.removeEventListener("app-toast", onToast);
  }, []);

  if (!toast) return null;

  return (
    <div className={`toast-mini ${toast.type}`} role="status" aria-live="polite"
         style={{ zIndex: 10050 /* cao hơn overlay loader 9999 */ }}>
      <i className={toast.type === "success" ? "bx bxs-check-circle" : "bx bxs-shield"} />
      {toast.text}
      <div className="toast-progress"></div>
    </div>
  );
}

/* ===== Frame: giữ Header cho web user, ẩn ở admin ===== */
function AppFrame({ children, onRoutePulse }) {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith("/admin");

  // tạo key theo path + search để kiểm soát deps gọn cho ESLint
  const pulseKey = useMemo(
    () => `${location.pathname}?${location.search}`,
    [location.pathname, location.search]
  );

  useEffect(() => {
    if (window.__SKIP_NEXT_PULSE__) {
      window.__SKIP_NEXT_PULSE__ = false;
    } else {
      onRoutePulse?.();
    }
  }, [pulseKey, onRoutePulse]);

  return (
    <div className="site">                    
      {!isAdminArea && <Header />}
      <main className="site-main">          
        {children}
      </main>
      {!isAdminArea && <Footer />}           
    </div>
  );
}

/* ================== App ================== */
export default function App() {
  // Trạng thái loader toàn cục
  const [loading, setLoading] = useState(false);
  const pending = useRef(0); // đếm số request đang chạy

  // Hàm bật/tắt loader an toàn
  const start = useCallback(() => {
    pending.current += 1;
    setLoading((prev) => (prev ? prev : true));
  }, []);

  const stop = useCallback(() => {
    pending.current = Math.max(0, pending.current - 1);
    if (pending.current === 0) setLoading(false);
  }, []);

  // Gắn headers từ localStorage ngay khi app khởi động (để F5 ở /admin vẫn OK)
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      if (user?.role) axios.defaults.headers.common["X-User-Role"] = user.role;
    } catch {
      // noop
    }
  }, []);

  // Cài axios interceptors — dọn dẹp đúng cách
  useEffect(() => {
    const reqId = axios.interceptors.request.use(
      (config) => { start(); return config; },
      (error)  => { stop(); return Promise.reject(error); }
    );
    const resId = axios.interceptors.response.use(
      (res)    => { stop(); return res; },
      (error)  => { stop(); return Promise.reject(error); }
    );
    return () => {
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
    };
  }, [start, stop]);

  // Nhá loader khi đổi route (để UX mượt)
  const pulseRouteLoading = useCallback(() => {
    start();
    const t = setTimeout(stop, 1000);
    return () => clearTimeout(t);
  }, [start, stop]);

  return (
    <BrowserRouter>
      {/* Overlay loader toàn cục */}
      {loading && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,.6)", backdropFilter: "blur(2px)"
          }}
        >
          <Loading />
        </div>
      )}

      {/* Toast toàn cục (luôn nổi trên overlay) */}
      <ToastRoot />

      <AppFrame onRoutePulse={pulseRouteLoading}>
        <Routes>
          {/* ✅ Trang chủ tự động điều hướng vào Admin nếu là nhân viên */}
          <Route path="/" element={<HomeOrAdmin />} />

          {/* Chi tiết sản phẩm */}
          <Route path="/product/:id" element={<ProductDetail />} />

          {/* Các trang public khác */}
          <Route path="/he-thong-cua-hang" element={<StoreLocator />} />
          <Route path="/chinh-sach-bao-hanh" element={<WarrantyPolicy />} />
          <Route path="/back-to-school" element={<BackToSchool />} />
          <Route path="/orders/:orderId" element={<OrderManagement />} />
          <Route path="/gio-hang" element={<Cart />} />
          <Route path="/donhang" element={<MyOrders />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/search" element={<Search />} />

          {/* Khu vực Admin */}
          <Route
            path="/admin/*"
            element={
              <RequireStaff>
                <AdminDashboard />
              </RequireStaff>
            }
          />

          {/* Fallback đặt CUỐI CÙNG */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppFrame>
    </BrowserRouter>
  );
}
