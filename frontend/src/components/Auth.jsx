import React, { useState } from "react";
import { Zap, Sparkles, User, Lock, Store, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Login states
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  // Signup states
  const [signupForm, setSignupForm] = useState({
    name: "",
    industry_type: "kirana",
    username: "",
    password: "",
  });

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:8000/api";

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      toast.error("Please fill all credentials.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(`Welcome back, ${data.name}!`);
        onAuthSuccess(data);
      } else {
        toast.error(data.detail || "Invalid login credentials.");
      }
    } catch (err) {
      toast.error("Auth server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupForm.name || !signupForm.username || !signupForm.password) {
      toast.error("Please fill all signup fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(`Account created for ${signupForm.name}!`);
        onAuthSuccess(data);
      } else {
        toast.error(data.detail || "Signup failed.");
      }
    } catch (err) {
      toast.error("Auth server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] px-4 relative overflow-hidden">
      {/* Dynamic blurred backdrop glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-3xl shadow-2xl relative">
        {/* App Logo */}
        <div className="flex flex-col items-center justify-center mb-8 space-y-2">
          <div className="p-3.5 bg-indigo-600 rounded-2xl text-slate-100 shadow-xl shadow-indigo-600/30">
            <Zap className="w-6 h-6 fill-slate-100" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-wider text-slate-100">
              AURA
            </h1>
            <p className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">
              Business Nervous System
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              isLogin
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              !isLogin
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Container */}
        {isLogin ? (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Username
              </label>
              <input
                type="text"
                required
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
                placeholder="Enter username"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Password
              </label>
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-6 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to Dashboard"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* SIGNUP FORM */
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <Store className="w-3.5 h-3.5" />
                Business / Shop Name
              </label>
              <input
                type="text"
                required
                value={signupForm.name}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, name: e.target.value })
                }
                placeholder="e.g. Verma General Store"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Industry Vertical
                </label>
                <select
                  value={signupForm.industry_type}
                  onChange={(e) =>
                    setSignupForm({
                      ...signupForm,
                      industry_type: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="kirana">Kirana / Retail</option>
                  <option value="tiffin">Tiffin / Food</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={signupForm.username}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, username: e.target.value })
                  }
                  placeholder="admin"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Password
              </label>
              <input
                type="password"
                required
                value={signupForm.password}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, password: e.target.value })
                }
                placeholder="Create password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-6 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Initialize Nervous System"}
              <Sparkles className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
