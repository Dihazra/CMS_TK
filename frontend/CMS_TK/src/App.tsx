import { Route, Routes, Navigate, Outlet } from "react-router-dom";

import DashboardPage from "@/pages/dashboard";
import KontenListPage from "@/pages/konten-list";
import UsersPage from "@/pages/users";
import LoginPage from "@/pages/login";

const ProtectedRoute = () => {
  const token = localStorage.getItem("cms_jwt_token");
  if (!token) {
    return <Navigate to="/login" replace />;
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
