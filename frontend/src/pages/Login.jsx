import { useState, useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";

function Login() {
  const { t } = useTranslation();
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const pwdRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setValidationError(null);

    if (!username.trim() || !password) {
      setValidationError(t("Please fill in all fields"));
      return;
    }

    setLoading(true);
    try {
      const ok = await login(username.trim(), password);
      if (!ok) {
        setError(t("Invalid username or password"));
        setPassword("");
        pwdRef.current?.focus();
      }
    } catch (err) {
      setError(t("Login error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="glass w-full max-w-md p-8 rounded-3xl">

        {/* Logo / Title */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center text-white font-bold">I</div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="login-form">

          <label className="text-sm text-white/60">Email / Username</label>
          <input
            type="text"
            placeholder="Email or Username"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setValidationError(null); setError(null); }}
            className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl outline-none"
            autoComplete="username"
            aria-label="username"
          />

          <label className="text-sm text-white/60">Password</label>
          <div className="relative">
            <input
              ref={pwdRef}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setValidationError(null); setError(null); }}
              className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl outline-none w-full"
              autoComplete="current-password"
              aria-label="password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-sm"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </div>

          {validationError && <div className="text-yellow-300 text-sm">{validationError}</div>}
          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-blue-600 py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            <span>{loading ? t("Signing in") : t("Sign in")}</span>
          </button>

        </form>

        <div className="text-center text-sm text-white/50 mt-6">demo: admin / 1234</div>

      </div>
    </div>
  );
}

export default Login;