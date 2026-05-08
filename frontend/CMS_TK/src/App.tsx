import { Route, Routes, Navigate, Outlet } from "react-router-dom";

import DashboardPage from "@/pages/dashboard";
import KontenListPage from "@/pages/konten-list";
import UsersPage from "@/pages/users";
import LoginPage from "@/pages/login";

const ProtectedRoute = () => {
  const token = localStorage.getItem("cms_jwt_token");
  const lastActiveStr = localStorage.getItem("cms_last_active");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10);
    // Jika tidak ada aktivitas lebih dari 15 menit (15 * 60 * 1000 ms)
    if (Date.now() - lastActive > 15 * 60 * 1000) {
      localStorage.removeItem("cms_jwt_token");
      localStorage.removeItem("cms_user");
      localStorage.removeItem("cms_last_active");
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};

function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardPage />} path="/" />
        <Route element={<KontenListPage />} path="/konten-list" />
        <Route element={<UsersPage />} path="/users" />
      </Route>
    </Routes>
  );
}

export default App;
