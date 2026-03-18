import { Outlet, Link, useLocation } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";

function MainLayout() {
  const location = useLocation();
  const { logout, role } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const currentLang = i18n.language?.startsWith("ru") ? "ru" : "en";
  const canManageAssets = role === "admin" || role === "manager";

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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

  const navItems = [
    { to: "/", label: t("Dashboard"), show: true },
    { to: "/furniture", label: t("Assets"), show: true },
    { to: "/furniture/create", label: t("Add Asset"), show: canManageAssets },
    { to: "/scan", label: t("Scan Mode"), show: true },
    { to: "/audit", label: t("Inventory Audit"), show: true },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020817] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-[-60px] h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-80px] top-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-80px] left-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 lg:flex">
        <div className="px-3 pt-3 sm:px-4 sm:pt-4 lg:hidden">
          <div className="glass flex items-center justify-between rounded-[22px] px-4 py-3 sm:px-5 sm:py-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="apple-btn !px-4 !py-2"
              aria-label="Open navigation"
            >
              ☰
            </button>

            <div className="min-w-0 px-3 text-center">
              <div className="truncate text-xs uppercase tracking-[0.22em] text-white/45">
                {t("Inventory System")}
              </div>
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                {t("Inventory")}
              </h1>
            </div>

            <button
              type="button"
              onClick={logout}
              className="apple-btn !px-4 !py-2 text-sm"
            >
              {t("Logout")}
            </button>
          </div>
        </div>

        {open && (
          <>
            <div
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />

            <aside className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-white/10 bg-slate-950/92 p-4 backdrop-blur-2xl sm:p-5 lg:hidden">
              <div className="mb-5 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate text-xs uppercase tracking-[0.22em] text-white/45">
                    {t("Inventory System")}
                  </div>
                  <h1 className="mt-2 truncate text-xl font-semibold tracking-tight">
                    {t("Inventory")}
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="apple-btn !px-4 !py-2"
                  aria-label="Close navigation"
                >
                  ✕
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-2 overflow-y-auto text-sm">
                {navItems
                  .filter((item) => item.show)
                  .map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={navLinkClass(item.to)}
                    >
                      {item.label}
                    </Link>
                  ))}
              </nav>

              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/45">
                  {t("Language")}
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
                  {t("Logout")}
                </button>
              </div>
            </aside>
          </>
        )}

        <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-[280px] lg:min-w-[280px] lg:flex-col lg:justify-between lg:p-4 xl:w-[320px] xl:min-w-[320px]">
          <div className="glass-strong flex h-full flex-col justify-between rounded-[30px] border border-white/10 p-5 xl:p-6">
            <div>
              <div className="mb-8">
                <div className="text-xs uppercase tracking-[0.25em] text-white/45">
                  {t("Inventory System")}
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                  {t("Inventory")}
                </h1>
              </div>

              <nav className="flex flex-col gap-2 text-sm">
                {navItems
                  .filter((item) => item.show)
                  .map((item) => (
                    <Link key={item.to} to={item.to} className={navLinkClass(item.to)}>
                      {item.label}
                    </Link>
                  ))}
              </nav>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/45">
                {t("Language")}
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
                {t("Logout")}
              </button>
            </div>
          </div>
        </aside>

        <main className="relative z-10 min-w-0 flex-1 px-3 pb-4 pt-4 sm:px-4 sm:pb-6 sm:pt-5 md:px-6 md:pb-8 md:pt-6 lg:px-8 lg:py-8 xl:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;