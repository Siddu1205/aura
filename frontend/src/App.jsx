import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Sparkles,
  RefreshCw,
  Terminal,
  Flame,
  UserX,
  PhoneCall,
  Zap,
  TrendingUp,
  FileText,
  LayoutDashboard,
  Database,
  LogOut,
  Calendar,
  IndianRupee,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Cards from "./components/Cards";
import Charts from "./components/Charts";
import AgentFeed from "./components/AgentFeed";
import ApprovalQueue from "./components/ApprovalQueue";
import AskAura from "./components/AskAura";
import ErpConsole from "./components/ErpConsole";
import Auth from "./components/Auth";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("aura_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState("dashboard"); // 'dashboard' | 'erp'
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [actions, setActions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);

  // Daily Summary configurations
  const [dateRange, setDateRange] = useState(1); // 1, 7, 30 days
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:8000/api";

  const handleAuthSuccess = (userData) => {
    localStorage.setItem("aura_user", JSON.stringify(userData));
    setUser(userData);
    setView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("aura_user");
    setUser(null);
    setStats(null);
    setCharts(null);
    setFinancials(null);
    setActions([]);
    setSummary(null);
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // Fetch stats
      const statsRes = await fetch(
        `${backendUrl}/dashboard/stats?business_id=${user.business_id}`,
      );
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch charts
      const chartsRes = await fetch(
        `${backendUrl}/dashboard/charts?business_id=${user.business_id}`,
      );
      const chartsData = await chartsRes.json();
      setCharts(chartsData);

      // Fetch financials
      const financialsRes = await fetch(
        `${backendUrl}/dashboard/financials?business_id=${user.business_id}`,
      );
      const financialsData = await financialsRes.json();
      setFinancials(financialsData);

      // Fetch expense breakdown
      const expBreakdownRes = await fetch(
        `${backendUrl}/dashboard/expenses/breakdown?business_id=${user.business_id}`,
      );
      const expBreakdownData = await expBreakdownRes.json();
      setExpenseBreakdown(expBreakdownData);

      // Fetch actions
      const actionsRes = await fetch(
        `${backendUrl}/actions?business_id=${user.business_id}`,
      );
      const actionsData = await actionsRes.json();

      // Toast notification checks for new proposed actions
      if (actions.length > 0 && actionsData.length > actions.length) {
        const newAction = actionsData[0]; // actions are returned newest first
        if (newAction.status === "proposed") {
          toast.success(
            `⚡ ${newAction.agent_type.toUpperCase()} Agent: Action proposed!`,
            {
              duration: 4000,
              icon: "🤖",
              style: {
                background: "#0f172a",
                color: "#38bdf8",
                border: "1px solid #0284c7",
              },
            },
          );
        }
      }
      setActions(actionsData);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // Poll dashboard stats & actions every 4 seconds
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 4000);
      return () => clearInterval(interval);
    }
  }, [actions, user]);

  // Execute Action Confirm
  const handleExecuteConfirm = async (id, payload) => {
    try {
      const res = await fetch(`${backendUrl}/actions/${id}/execute-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === "success") {
        if (data.email_sent) {
          toast.success(
            `Action Executed & Email Dispatched to ${data.recipient}!`,
            {
              style: { background: "#047857", color: "#ecfdf5" },
              duration: 5000,
            },
          );
        } else {
          toast.success(
            "Action Executed (Notified locally in sent_emails.log)!",
            {
              style: { background: "#065f46", color: "#a7f3d0" },
            },
          );
        }
        fetchDashboardData();
      }
    } catch (err) {
      toast.error("Execution failed.");
    }
  };

  // Ignore Action
  const handleIgnore = async (id) => {
    try {
      const res = await fetch(`${backendUrl}/actions/${id}/ignore`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.error("Action Ignored.", {
          style: { background: "#1e293b", color: "#94a3b8" },
        });
        fetchDashboardData();
      }
    } catch (err) {
      toast.error("Ignore failed.");
    }
  };

  // Daily Summary Generation (with range support)
  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    toast.loading(`Analyzing operational brief (Last ${dateRange} days)...`, {
      id: "summary-toast",
    });
    try {
      const res = await fetch(`${backendUrl}/insight/daily-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: user.business_id,
          date_range_days: dateRange,
        }),
      });
      const data = await res.json();
      setSummary(data);
      toast.success("Store brief generated!", { id: "summary-toast" });
    } catch (e) {
      toast.error("Failed to generate summary.", { id: "summary-toast" });
    } finally {
      setLoadingSummary(false);
    }
  };

  // Q&A submission callback
  const handleAskAura = async (question) => {
    const res = await fetch(`${backendUrl}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, business_id: user.business_id }),
    });
    const data = await res.json();
    return data.answer;
  };

  // Trigger Helpers
  const triggerHelper = async (endpoint, label) => {
    toast.loading(`Activating ${label} Agent...`, { id: "trigger-toast" });
    try {
      const res = await fetch(
        `${backendUrl}/demo/${endpoint}?business_id=${user.business_id}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(`Agent Active! Checking database...`, {
          id: "trigger-toast",
          duration: 2000,
        });
        setTimeout(fetchDashboardData, 1000);
      } else {
        toast.error(
          data.detail || "Trigger simulation failed. Add records to ERP first.",
          { id: "trigger-toast" },
        );
      }
    } catch (e) {
      toast.error("Trigger simulation failed. Add records to ERP first.", {
        id: "trigger-toast",
      });
    }
  };

  // Simulate Voice Call Booking
  const triggerVoiceSimulation = async () => {
    toast.loading("Incoming Booking Call Simulating...", { id: "voice-toast" });
    try {
      const res = await fetch(`${backendUrl}/webhooks/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: "Vikram Singh",
          transcript:
            "Hey, please send 3 packets of Aashirvaad Atta and 1 kg of Moong Dal to my house.",
          business_id: user.business_id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Booking Confirmed! Added to Orders & Feed.`, {
          id: "voice-toast",
          duration: 4000,
        });
        setTimeout(fetchDashboardData, 500);
      } else {
        toast.error(
          data.detail || "Voice simulation failed. Set up inventory first.",
          { id: "voice-toast" },
        );
      }
    } catch (e) {
      toast.error("Voice simulation failed. Set up inventory first.", {
        id: "voice-toast",
      });
    }
  };

  // If user is not authenticated, render Login/Signup component
  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Auth onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <Toaster position="top-right" />

      {/* Top Header & Navigation */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-slate-100 shadow-lg shadow-indigo-600/30">
              <Zap className="w-5 h-5 fill-slate-100" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-slate-100">
                {user.name}
              </h1>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">
                AURA Business Nervous System
              </p>
            </div>
          </div>

          {/* Core View Switch Toggle */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setView("dashboard")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                view === "dashboard"
                  ? "bg-indigo-600 text-slate-100 shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Mission Control
            </button>
            <button
              onClick={() => setView("erp")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                view === "erp"
                  ? "bg-indigo-600 text-slate-100 shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database className="w-4 h-4" />
              ERP Ledger core
            </button>
          </div>

          {/* Dynamic Health Strip */}
          {stats && stats.agents && (
            <div className="hidden lg:flex items-center gap-6 text-xs border-l border-slate-800 pl-6">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${stats.agents.restock === "Active" ? "bg-emerald-500 animate-ping" : "bg-slate-500"}`}
                ></span>
                <span className="text-slate-400 font-medium">Restock:</span>
                <span
                  className={
                    stats.agents.restock === "Active"
                      ? "text-emerald-400 font-bold"
                      : "text-slate-500"
                  }
                >
                  {stats.agents.restock}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${stats.agents.collections === "Active" ? "bg-emerald-500 animate-ping" : "bg-slate-500"}`}
                ></span>
                <span className="text-slate-400 font-medium">Collections:</span>
                <span
                  className={
                    stats.agents.collections === "Active"
                      ? "text-emerald-400 font-bold"
                      : "text-slate-500"
                  }
                >
                  {stats.agents.collections}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${stats.agents.winback === "Active" ? "bg-emerald-500 animate-ping" : "bg-slate-500"}`}
                ></span>
                <span className="text-slate-400 font-medium">Winback:</span>
                <span
                  className={
                    stats.agents.winback === "Active"
                      ? "text-emerald-400 font-bold"
                      : "text-slate-500"
                  }
                >
                  {stats.agents.winback}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${stats.agents.voice === "Active" ? "bg-emerald-500 animate-ping" : "bg-slate-500"}`}
                ></span>
                <span className="text-slate-400 font-medium">Voice:</span>
                <span
                  className={
                    stats.agents.voice === "Active"
                      ? "text-emerald-400 font-bold"
                      : "text-slate-500"
                  }
                >
                  {stats.agents.voice}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchDashboardData().then(() => setRefreshing(false));
              }}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* Render View */}
        {view === "dashboard" ? (
          <>
            {/* Dynamic AI Summary Dashboard Brief */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden animate-slide-in">
              <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl"></div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
                  <Sparkles className="w-4 h-4" />
                  <span>AURA Core Insight</span>
                </div>
                {summary ? (
                  <div className="space-y-4">
                    <p className="text-slate-200 text-sm font-medium leading-relaxed">
                      {summary.summary_text}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mr-2">
                        Quick Commands:
                      </span>
                      {summary.recommendations.map((rec, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (rec.toLowerCase().includes("stock"))
                              triggerHelper("trigger-stock-drop", "Restock");
                            else if (rec.toLowerCase().includes("reminder"))
                              triggerHelper(
                                "trigger-customer-due",
                                "Collections",
                              );
                            else toast.success(`Shortcut run: ${rec}`);
                          }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 hover:bg-indigo-600 text-indigo-300 hover:text-slate-100 border border-indigo-500/20 hover:border-indigo-500 transition-all"
                        >
                          {rec}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs font-medium max-w-xl">
                    Ready to compile a unified operational brief. Select your
                    range parameter and run scans.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 bg-slate-950/80 p-1 border border-slate-800 rounded-xl w-full md:w-auto">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(parseInt(e.target.value))}
                  className="bg-transparent border-0 text-xs font-semibold text-slate-400 p-2 focus:outline-none w-28"
                >
                  <option value="1">24 Hours</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                </select>
                <button
                  onClick={handleGenerateSummary}
                  disabled={loadingSummary}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 hover:scale-[1.01] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg border border-indigo-400/20"
                >
                  <FileText className="w-4 h-4" />
                  {loadingSummary ? "Analyzing..." : "Generate Summary"}
                </button>
              </div>
            </div>

            {/* HERO LOGS: Live Feed & Approval Queue */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Live Feed (BIG - HERO) */}
              <div className="xl:col-span-2">
                <AgentFeed actions={actions} />
              </div>

              {/* Approval Queue */}
              <div className="xl:col-span-1">
                <ApprovalQueue
                  actions={actions}
                  onExecute={handleExecuteConfirm}
                  onIgnore={handleIgnore}
                />
              </div>
            </div>

            {/* Financial Analytics ledger breakdown */}
            {financials && (
              <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-xl animate-slide-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold tracking-wide">
                      Monthly Financial Performance Ledger
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Current Month
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                        Gross Revenue
                      </span>
                      <span className="text-lg font-extrabold text-slate-200 mt-1 block">
                        {financials.monthly_revenue}
                      </span>
                    </div>
                    <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                        Cost of Goods (COGS)
                      </span>
                      <span className="text-lg font-extrabold text-slate-300 mt-1 block">
                        {financials.monthly_cogs}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-800 rounded-lg text-slate-400">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                        Total Expenses
                      </span>
                      <span className="text-lg font-extrabold text-rose-400 mt-1 block">
                        {financials.monthly_expenses || "₹0.00"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                        Net Profit
                      </span>
                      <span className="text-lg font-extrabold text-emerald-400 mt-1 block">
                        {financials.monthly_profit}
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/50 text-xs">
                  <span className="text-slate-400 font-medium">
                    Weekly Comparison:
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold ${
                        financials.weekly_comparison.is_positive
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {financials.weekly_comparison.is_positive ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {financials.weekly_comparison.growth_pct}%
                    </span>
                    <span className="text-slate-500 font-mono">
                      ({financials.weekly_comparison.label})
                    </span>
                  </div>
                </div>

                {expenseBreakdown && expenseBreakdown.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Expense Breakdown by Category
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {expenseBreakdown.map((item) => (
                        <div
                          key={item.name}
                          className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/40 text-xs"
                        >
                          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                            {item.name}
                          </span>
                          <span className="text-sm font-bold text-rose-400 mt-1 block">
                            ₹{item.value.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Operational KPI Cards */}
            {stats && <Cards stats={stats} />}

            {/* Business Charts */}
            {charts && <Charts data={charts} />}
          </>
        ) : (
          /* ERP core view */
          <ErpConsole user={user} />
        )}

        {/* Demo Helper Control Panel */}
        <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Terminal className="w-4 h-4" />
            <span>Interactive Demo Controller (Judges / Testing)</span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Click these triggers to immediately mutate database states. Within
            10 seconds, the orchestrator will notice the change, show top-right
            toasts, and slide actions into the feed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <button
              onClick={() => triggerHelper("trigger-stock-drop", "Restock")}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-600/10 text-blue-400 border border-slate-800 hover:border-blue-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Flame className="w-4 h-4" />
              Trigger Stock Drop
            </button>
            <button
              onClick={() =>
                triggerHelper("trigger-customer-due", "Collections")
              }
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600/10 text-emerald-400 border border-slate-800 hover:border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              Trigger Overdue Debt
            </button>
            <button
              onClick={() => triggerHelper("trigger-customer-churn", "Winback")}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-pink-600/10 text-pink-400 border border-slate-800 hover:border-pink-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <UserX className="w-4 h-4" />
              Trigger Churn Warning
            </button>
            <button
              onClick={triggerVoiceSimulation}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-violet-600/10 text-violet-400 border border-slate-800 hover:border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <PhoneCall className="w-4 h-4" />
              Simulate Customer Booking Call
            </button>
          </div>
        </div>
      </main>

      {/* Floating Q&A Console */}
      <AskAura onAsk={handleAskAura} />
    </div>
  );
}
