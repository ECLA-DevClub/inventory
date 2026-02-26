import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FurnitureList from "./pages/FurnitureList";
import FurnitureCreate from "./pages/FurnitureCreate";
import FurnitureEdit from "./pages/FurnitureEdit";
import FurnitureDetail from "./pages/FurnitureDetail";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

function App() {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) return <Login />;

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/furniture" element={<FurnitureList />} />
        <Route path="/furniture/create" element={<FurnitureCreate />} />
        <Route path="/furniture/:id" element={<FurnitureDetail />} />
        <Route path="/furniture/:id/edit" element={<FurnitureEdit />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;