import { Outlet, Link, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";

function MainLayout() {
  const location = useLocation();
  const { logout, role } = useContext(AuthContext);
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const currentLang = i18n.language?.startsWith("ru") ? "ru" : "en";
  const canManageAssets = role === "admin" || role === "manager";

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setOpen(false);
  };

  const isActive = (path) =>
    location.pathname === path
      ? "bg-white/15 text-white border border-white/15 shadow-[0_12px_32px_rgba(59,130,246,0.18)]"
      : "text-white/70 hover:text-white hover:bg-white/8 border border-transparent";

  const navLinkClass = (path) =>
    `rounded-2xl px-4 py-3 backdrop-blur-md transition-all duration-300 ${isActive(path)}`;

  const langBtnClass = (lang) =>
    `flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
      currentLang === lang
        ? "bg-white/15 text-white border border-white/15 shadow-[0_12px_32px_rgba(59,130,246,0.18)]"
        : "bg-white/[0.04] text-white/70 border border-white/10 hover:bg-white/8 hover:text-white"
    }`;

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-[-60px] h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-80px] top-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-80px] left-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 px-4 pt-4 md:hidden">
        <div className="glass flex items-center justify-between rounded-[22px] px-4 py-4">
          <button
            onClick={() => setOpen(true)}
            className="apple-btn !px-4 !py-2"
          >
            ☰
          </button>

          <h1 className="text-lg font-semibold tracking-tight">Inventory</h1>

          <div className="w-[52px]" />
        </div>
      </div>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm md:hidden"
          />

          <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col justify-between border-r border-white/10 bg-slate-950/85 p-6 backdrop-blur-2xl md:hidden">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-semibold tracking-tight">
                  Inventory
                </h1>
                <button
                  onClick={() => setOpen(false)}
                  className="apple-btn !px-4 !py-2"
                >
                  ✕
                </button>
              </div>

              <nav className="flex flex-col gap-2 text-sm">
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className={navLinkClass("/")}
                >
                  Dashboard
                </Link>

                <Link
                  to="/furniture"
                  onClick={() => setOpen(false)}
                  className={navLinkClass("/furniture")}
                >
                  Assets
                </Link>

                {canManageAssets && (
                  <Link
                    to="/furniture/create"
                    onClick={() => setOpen(false)}
                    className={navLinkClass("/furniture/create")}
                  >
                    Add Asset
                  </Link>
                )}

                <Link
                  to="/scan"
                  onClick={() => setOpen(false)}
                  className={navLinkClass("/scan")}
                >
                  Scan Mode
                </Link>

                <Link
                  to="/audit"
                  onClick={() => setOpen(false)}
                  className={navLinkClass("/audit")}
                >
                  Inventory Audit
                </Link>
              </nav>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/45">
                Language
              </div>

              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => changeLanguage("en")}
                  className={langBtnClass("en")}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguage("ru")}
                  className={langBtnClass("ru")}
                >
                  RU
                </button>
              </div>

              <button onClick={logout} className="apple-btn w-full text-center">
                Logout
              </button>
            </div>
          </aside>
        </>
      )}

      <div className="relative z-10 md:flex">
        <aside className="hidden md:flex md:m-4 md:mr-0 md:h-[calc(100vh-2rem)] md:w-72 md:flex-col md:justify-between md:rounded-[28px] md:border md:border-white/10 md:p-6 md:glass-strong">
          <div>
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.25em] text-white/45">
                Inventory System
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                Inventory
              </h1>
            </div>

            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/" className={navLinkClass("/")}>
                Dashboard
              </Link>

              <Link to="/furniture" className={navLinkClass("/furniture")}>
                Assets
              </Link>

              {canManageAssets && (
                <Link
                  to="/furniture/create"
                  className={navLinkClass("/furniture/create")}
                >
                  Add Asset
                </Link>
              )}

              <Link to="/scan" className={navLinkClass("/scan")}>
                Scan Mode
              </Link>

              <Link to="/audit" className={navLinkClass("/audit")}>
                Inventory Audit
              </Link>
            </nav>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/45">
              Language
            </div>

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => changeLanguage("en")}
                className={langBtnClass("en")}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => changeLanguage("ru")}
                className={langBtnClass("ru")}
              >
                RU
              </button>
            </div>

            <button onClick={logout} className="apple-btn w-full text-center">
              Logout
            </button>
          </div>
        </aside>

        <main className="w-full min-w-0 flex-1 px-4 pb-6 pt-6 md:px-8 md:py-8 lg:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;