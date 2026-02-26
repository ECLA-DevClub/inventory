import { Outlet, Link, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { InventoryContext } from "../context/InventoryContext";

function MainLayout() {
  const location = useLocation();
  const { logout } = useContext(AuthContext);
  const { tenants, activeTenantId, setActiveTenantId } =
    useContext(InventoryContext);

  const [open, setOpen] = useState(false);

  const isActive = (path) =>
    location.pathname === path
      ? "bg-blue-600 text-white"
      : "text-gray-300 hover:bg-white/10 transition";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between px-4 py-4 border-b border-white/10">
        <button onClick={() => setOpen(true)} className="text-2xl">
          ☰
        </button>
        <h1 className="font-semibold text-lg">Inventory</h1>
        <div />
      </div>

      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside
  className={`
    w-72 bg-slate-900 border-r border-white/10
    flex flex-col justify-between p-6
    ${open ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0
    fixed md:relative
    top-0 left-0
    h-screen md:h-auto md:min-h-screen
    transition-transform duration-300
    z-50
  `}
>
          <div>
            {/* MOBILE CLOSE */}
            <div className="flex justify-between items-center md:hidden mb-6">
              <h1 className="text-xl font-semibold">Inventory</h1>
              <button onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* DESKTOP TITLE */}
            <h1 className="hidden md:block text-xl font-semibold mb-6">
              Inventory
            </h1>

            <nav className="flex flex-col gap-2 text-sm">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-xl ${isActive("/")}`}
              >
                Dashboard
              </Link>

              <Link
                to="/furniture"
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-xl ${isActive("/furniture")}`}
              >
                Assets
              </Link>

              <Link
                to="/furniture/create"
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-xl ${isActive("/furniture/create")}`}
              >
                Add Asset
              </Link>
            </nav>
          </div>

          <button
            onClick={logout}
            className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
          >
            Logout
          </button>
        </aside>

        {/* OVERLAY */}
        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 md:hidden z-40"
          />
        )}

        {/* CONTENT */}
        <main className="flex-1 px-4 md:px-10 py-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}

export default MainLayout;