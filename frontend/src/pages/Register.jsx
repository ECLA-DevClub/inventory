import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api";

function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const trimmedFullName = useMemo(() => fullName.trim(), [fullName]);
  const trimmedEmail = useMemo(() => email.trim(), [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!trimmedFullName || !trimmedEmail || !password || !repeatPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        email: trimmedEmail,
        password,
      });

      setSuccess("First admin account created successfully. Now sign in.");
      setFullName("");
      setEmail("");
      setPassword("");
      setRepeatPassword("");

      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      setError(err?.message || "Registration error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.14),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-[-60px] h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-40px] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="glass-strong hover-lift shine-hover w-full max-w-md rounded-[2rem] border border-white/15 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-gradient-to-br from-blue-500/80 via-cyan-400/70 to-indigo-600/80 text-lg font-bold text-white shadow-lg shadow-blue-900/30">
              I
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
                Product-ready
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Register
              </h1>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65 backdrop-blur-xl">
            Create the first administrator account for initial setup
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            aria-label="register-form"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                Full name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-[40px] border border-white/10 bg-white/[0.06] px-6 py-5 text-base text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-[40px] border border-white/10 bg-white/[0.06] px-6 py-5 text-base text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full rounded-[40px] border border-white/10 bg-white/[0.06] px-6 py-5 pr-24 text-base text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
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
                Repeat password
              </label>

              <div className="relative">
                <input
                  type={showRepeatPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={repeatPassword}
                  onChange={(e) => {
                    setRepeatPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full rounded-[40px] border border-white/10 bg-white/[0.06] px-6 py-5 pr-24 text-base text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() => setShowRepeatPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {showRepeatPassword ? "Hide" : "Show"}
                </button>
              </div>
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
              <span>{loading ? "Creating..." : "Create admin account"}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-white/45">
              Already have an account?
            </span>{" "}
            <Link
              to="/"
              className="text-sm font-semibold text-blue-300 transition hover:text-blue-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;