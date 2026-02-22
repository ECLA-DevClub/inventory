import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Login() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="glass w-full max-w-md p-8 rounded-3xl">

        <h1 className="text-2xl font-semibold mb-8 text-center">
          Inventory System
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <input
            type="text"   // ✅ Username visible
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl outline-none"
          />

          <input
            type="password"   // ✅ Password hidden as dots
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl outline-none"
          />

          <button
            type="submit"
            className="bg-blue-600 py-3 rounded-xl hover:bg-blue-700 transition"
          >
            Login
          </button>

        </form>

        <div className="text-center text-sm text-white/50 mt-6">
          admin / 1234
        </div>

      </div>
    </div>
  );
}

export default Login;