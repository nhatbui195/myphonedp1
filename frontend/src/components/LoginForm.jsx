// src/components/LoginForm.jsx
import React, { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "../styles/components/LoginForm.css";
import "../styles/components/ToastMini.css";
import { migrateGuestCartToUser } from "../utils/cart";

const ADMIN_REDIRECT_DELAY = 1000;

function normalizeRole(r) {
  return String(r || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}
function computeIsAdmin(u) {
  if (!u) return false;
  if (u.isAdmin === true || u.isAdmin === 1 || u.isAdmin === "1") return true;
  const r = normalizeRole(u.role || u.VaiTro || u.type);
  return r === "nhanvien";
}

export default function LoginForm({ onSwitchToRegister, onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navTimer = useRef(null);

  // CHANGED: không clear timeout khi unmount, để timer vẫn chạy sau khi modal đóng
  useEffect(() => {
    return () => {};
  }, []);

  const appToast = (type, text, ms = 2500) => {
    window.dispatchEvent(new CustomEvent("app-toast", { detail: { type, text, ms } }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      appToast("error", "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/api/login", { username, password });
      const token = res.data?.token;
      const rawUser = res.data?.user;

      if (!rawUser || !token) {
        appToast("error", "Phản hồi đăng nhập không hợp lệ");
        return;
      }

      const normalizedRole = normalizeRole(rawUser.role || rawUser.VaiTro);
      const user = {
        ...rawUser,
        role: normalizedRole,
        isAdmin: computeIsAdmin({ ...rawUser, role: normalizedRole }),
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      api.defaults.headers.common["X-User-Role"] = user.role || "";
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      migrateGuestCartToUser();
      window.dispatchEvent(new CustomEvent("auth-changed", { detail: { user } }));

      appToast("success", `Đăng nhập thành công! Xin chào ${user.username || username}`, ADMIN_REDIRECT_DELAY);

      // CHANGED: lên lịch redirect TRƯỚC khi đóng modal, và sẽ không bị cleanup hủy
      navTimer.current = setTimeout(() => {
        window.location.replace("/admin"); // hard reload
      }, ADMIN_REDIRECT_DELAY);

      onLoginSuccess?.(); // đóng modal sau khi đã set timer

      window.__SKIP_NEXT_PULSE__ = true;

    } catch (err) {
      appToast("error", err?.response?.data?.message || "Đăng nhập thất bại", 1200);
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  return (
    <form className="login-form" onSubmit={handleLogin}>
      <h2>Đăng nhập</h2>

      <label>Tên đăng nhập:</label>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        required
      />

      <label>Mật khẩu:</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />

      <button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>

      {onSwitchToRegister && (
        <p className="login-register-note">
          Bạn chưa có tài khoản?{" "}
          <button type="button" className="register-link" onClick={onSwitchToRegister}>
            Đăng ký ngay
          </button>
        </p>
      )}
    </form>
  );
}
