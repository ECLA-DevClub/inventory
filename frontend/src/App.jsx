import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FurnitureList from "./pages/FurnitureList";
import FurnitureCreate from "./pages/FurnitureCreate";
import FurnitureEdit from "./pages/FurnitureEdit";
import FurnitureDetail from "./pages/FurnitureDetail";
import FurnitureLabel from "./pages/FurnitureLabel";
import ScanPage from "./pages/ScanPage";
import AuditSession from "./pages/AuditSession";
import { AuthContext } from "./context/AuthContext";

function RoleRoute({ allow, children }) {
  const { role } = useContext(AuthContext);

  if (!allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) return <Login />;

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/furniture" element={<FurnitureList />} />
        <Route path="/furniture/:id" element={<FurnitureDetail />} />
        <Route path="/furniture/:id/label" element={<FurnitureLabel />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/audit" element={<AuditSession />} />

        <Route
          path="/furniture/create"
          element={
            <RoleRoute allow={["admin", "manager"]}>
              <FurnitureCreate />
            </RoleRoute>
          }
        />

        <Route
          path="/furniture/:id/edit"
          element={
            <RoleRoute allow={["admin", "manager"]}>
              <FurnitureEdit />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;