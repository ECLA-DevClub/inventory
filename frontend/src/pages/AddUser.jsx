import { useMemo, useState, useContext, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createUser, getUsers, deleteUser } from "../api";
import { AuthContext } from "../context/AuthContext";

const ROLE_OPTIONS = [
  { value: "manager", label: "MANAGER" },
  { value: "accountant", label: "ACCOUNTANT" },
  { value: "technician", label: "TECHNICIAN" },
  { value: "viewer", label: "VIEWER" },
];

function AddUser() {
  const { token } = useContext(AuthContext);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("manager");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [createdUser, setCreatedUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [usersOpen, setUsersOpen] = useState(true);
  const [openUserId, setOpenUserId] = useState(null);

  const trimmedFullName = useMemo(() => fullName.trim(), [fullName]);
  const trimmedEmail = useMemo(() => email.trim(), [email]);

  // Получаем ID текущего пользователя из localStorage
  const currentUserId = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      return user?.id;
    } catch {
      return null;
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");

    try {
      const data = await getUsers(token);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsersError(err?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDeleteUser = async (id) => {
    // Проверка на удаление самого себя
    if (id === currentUserId) {
      setError("Нельзя удалить самого себя");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!window.confirm("Удалить пользователя?")) return;

    try {
      await deleteUser(id, token);
      await loadUsers();
      setSuccess("Пользователь успешно удален");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.message || "Ошибка удаления пользователя");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!trimmedFullName || !trimmedEmail || !password || !role) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: trimmedFullName,
        email: trimmedEmail,
        password,
        role,
      };

      const created = await createUser(payload, token);

      setCreatedUser({
        id: created.id,
        full_name: created.full_name || trimmedFullName,
        email: created.email || trimmedEmail,
        role: created.role || role,
        password,
      });

      setDetailsOpen(true);
      setUsersOpen(true);
      setSuccess(
        `User created successfully: ${created.full_name || created.email} (${created.role})`
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("manager");
      setShowPassword(false);

      await loadUsers();
    } catch (err) {
      setError(err?.message || "User creation error");
    } finally {
      setLoading(false);
    }
  };

  const detailRowClass =
    "flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between";

  const detailLabelClass = "text-xs uppercase tracking-[0.18em] text-white/40";
  const detailValueClass = "text-sm font-medium text-white break-all";

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.28em] text-white/40">
              Management Panel
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Add User
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              Create accounts for manager, accountant, technician, and viewer.
              Only admin can access this page.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-7">
          <div className="mb-6 rounded-2xl border border-blue-400/15 bg-blue-400/10 px-4 py-3 text-sm text-blue-100">
            Admin creates users manually. Self-registration is not used for
            manager, accountant, technician, or viewer.
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                Full name
              </label>
              <input
                type="text"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-4 text-base text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-4 text-base text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-4 pr-24 text-base text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-[28px] border border-white/10 bg-slate-900/80 px-5 py-4 text-base text-white outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/20"
              >
                {ROLE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="apple-btn apple-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading && (
                <svg
                  className="h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-80"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              )}
              <span>{loading ? "Creating user..." : "Create user"}</span>
            </button>
          </form>
        </div>

        {createdUser && (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-7">
            <button
              type="button"
              onClick={() => setDetailsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:bg-white/[0.07]"
            >
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                  Created User Details
                </div>
                <div className="mt-1 text-base font-semibold text-white">
                  {createdUser.full_name}
                </div>
              </div>

              <div className="text-2xl leading-none text-white/70">
                {detailsOpen ? "▾" : "▸"}
              </div>
            </button>

            {detailsOpen && (
              <div className="mt-4 space-y-3">
                <div className={detailRowClass}>
                  <div className={detailLabelClass}>Full name</div>
                  <div className={detailValueClass}>{createdUser.full_name}</div>
                </div>

                <div className={detailRowClass}>
                  <div className={detailLabelClass}>Email</div>
                  <div className={detailValueClass}>{createdUser.email}</div>
                </div>

                <div className={detailRowClass}>
                  <div className={detailLabelClass}>Password</div>
                  <div className={detailValueClass}>{createdUser.password}</div>
                </div>

                <div className={detailRowClass}>
                  <div className={detailLabelClass}>Role</div>
                  <div className={detailValueClass}>
                    {String(createdUser.role || "").toUpperCase()}
                  </div>
                </div>

                <div className={detailRowClass}>
                  <div className={detailLabelClass}>User ID</div>
                  <div className={detailValueClass}>{createdUser.id}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-7">
          <button
            type="button"
            onClick={() => setUsersOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition hover:bg-white/[0.07]"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                All Users
              </div>
              <div className="mt-1 text-base font-semibold text-white">
                {usersLoading ? "Loading..." : `${users.length} user(s)`}
              </div>
            </div>

            <div className="text-2xl leading-none text-white/70">
              {usersOpen ? "▾" : "▸"}
            </div>
          </button>

          {usersOpen && (
            <div className="mt-4">
              {usersLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/70">
                  Loading users...
                </div>
              ) : usersError ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-sm text-red-300">
                  {usersError}
                </div>
              ) : users.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/70">
                  No users found.
                </div>
              ) : (
                <div>
                  {/* Кнопки управления раскрытием */}
                  <div className="mb-3 flex gap-2">
                    <button
                      onClick={() => setOpenUserId("all")}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Раскрыть всех
                    </button>
                    <span className="text-white/30">|</span>
                    <button
                      onClick={() => setOpenUserId(null)}
                      className="text-xs text-white/50 hover:text-white/70 transition-colors"
                    >
                      Скрыть всех
                    </button>
                  </div>

                  <div className="space-y-3">
                    {users.map((userItem) => (
                      <div
                        key={userItem.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
                      >
                        {/* HEADER */}
                        <div
                          onClick={() =>
                            setOpenUserId(openUserId === userItem.id ? null : userItem.id)
                          }
                          className="flex cursor-pointer flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div>
                            <div className="text-base font-semibold text-white">
                              {userItem.full_name || "No name"}
                            </div>
                            <div className="text-sm text-white/60">{userItem.email}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-xs bg-blue-500/20 px-2 py-1 rounded">
                              {String(userItem.role).toUpperCase()}
                            </div>

                            <div>{(openUserId === userItem.id || openUserId === "all") ? "▾" : "▸"}</div>
                          </div>
                        </div>

                        {/* DETAILS */}
                        {(openUserId === userItem.id || openUserId === "all") && (
                          <div className="mt-4 space-y-2 text-sm text-white/80">
                            <div>User ID: {userItem.id}</div>

                            {/* ⚠️ ПАРОЛЯ ТУТ НЕ БУДЕТ С БЕКА */}
                            <div className="text-yellow-400">
                              Пароль не хранится (безопасность)
                            </div>

                            {/* Кнопка удаления - не показываем для текущего пользователя */}
                            {userItem.id !== currentUserId && (
                              <button
                                onClick={() => handleDeleteUser(userItem.id)}
                                className="mt-2 rounded bg-red-500 px-3 py-1 text-sm hover:bg-red-600 transition-colors"
                              >
                                Удалить
                              </button>
                            )}
                            
                            {/* Сообщение для текущего пользователя */}
                            {userItem.id === currentUserId && (
                              <div className="mt-2 text-xs text-white/40 italic">
                                Вы не можете удалить самого себя
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddUser;