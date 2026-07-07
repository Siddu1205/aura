import React, { useState, useEffect } from "react";
import {
  Package,
  Users,
  Truck,
  ShoppingCart,
  Plus,
  Check,
  Mail,
  Server,
  Lock,
  Bell,
  AlertCircle,
  DollarSign,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ErpConsole({ user }) {
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Settings / SMTP state
  const [smtpSettings, setSmtpSettings] = useState({
    smtp_email: "",
    smtp_password: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
  });

  // Form states
  const [prodForm, setProdForm] = useState({
    name: "",
    current_stock: "",
    reorder_threshold: "",
    unit_cost: "",
    supplier_id: "",
  });
  const [custForm, setCustForm] = useState({
    name: "",
    contact_channel: "",
    consent_status: "opted_in",
    outstanding_due: "0",
  });
  const [suppForm, setSuppForm] = useState({ name: "", contact_channel: "" });
  const [saleForm, setSaleForm] = useState({
    customer_id: "",
    product_id: "",
    quantity: "1",
  });

  // Custom Reminder form state
  const [reminderForm, setReminderForm] = useState({
    title: "",
    what_to_remind: "",
    remind_who: "Self",
    contact_channel: "",
  });

  // Expense form state
  const [expForm, setExpForm] = useState({
    title: "",
    category: "Rent",
    amount: "",
    date: "",
  });

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:8000/api";

  const fetchData = async () => {
    if (!user) return;
    try {
      const pRes = await fetch(
        `${backendUrl}/products?business_id=${user.business_id}`,
      );
      const pData = await pRes.json();
      setProducts(pData);

      const cRes = await fetch(
        `${backendUrl}/customers?business_id=${user.business_id}`,
      );
      const cData = await cRes.json();
      setCustomers(cData);

      const sRes = await fetch(
        `${backendUrl}/suppliers?business_id=${user.business_id}`,
      );
      const sData = await sRes.json();
      setSuppliers(sData);

      // Fetch expenses
      const expRes = await fetch(
        `${backendUrl}/expenses?business_id=${user.business_id}`,
      );
      const expData = await expRes.json();
      setExpenses(expData);

      // Fetch SMTP settings
      const settingsRes = await fetch(
        `${backendUrl}/settings?business_id=${user.business_id}`,
      );
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const emailVal = settingsData.smtp_email || "";
        setSmtpSettings({
          smtp_email: emailVal,
          smtp_password: settingsData.smtp_password || "",
          smtp_host: settingsData.smtp_host || "smtp.gmail.com",
          smtp_port: settingsData.smtp_port || "587",
        });

        // Default contact channel for 'Self' reminder
        if (
          reminderForm.remind_who === "Self" &&
          !reminderForm.contact_channel
        ) {
          setReminderForm((prev) => ({
            ...prev,
            contact_channel: emailVal || user.username || "",
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, user]);

  // Adjust reminder contact channel when 'remind_who' changes
  useEffect(() => {
    if (reminderForm.remind_who === "Self") {
      setReminderForm((prev) => ({
        ...prev,
        contact_channel: smtpSettings.smtp_email || user.username || "",
      }));
    } else {
      setReminderForm((prev) => ({ ...prev, contact_channel: "" }));
    }
  }, [reminderForm.remind_who]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (
      !prodForm.name ||
      !prodForm.current_stock ||
      !prodForm.reorder_threshold ||
      !prodForm.unit_cost
    ) {
      toast.error("Please fill all product fields.");
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prodForm, business_id: user.business_id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Product ${prodForm.name} Added to Inventory!`);
        setProdForm({
          name: "",
          current_stock: "",
          reorder_threshold: "",
          unit_cost: "",
          supplier_id: "",
        });
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to add product.");
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!custForm.name || !custForm.contact_channel) {
      toast.error("Please fill all customer fields.");
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...custForm, business_id: user.business_id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Customer ${custForm.name} Added to Ledger!`);
        setCustForm({
          name: "",
          contact_channel: "",
          consent_status: "opted_in",
          outstanding_due: "0",
        });
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to add customer.");
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!suppForm.name || !suppForm.contact_channel) {
      toast.error("Please fill all supplier fields.");
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...suppForm, business_id: user.business_id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Supplier ${suppForm.name} Added!`);
        setCustForm({
          name: "",
          contact_channel: "",
          consent_status: "opted_in",
          outstanding_due: "0",
        });
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to add supplier.");
    }
  };

  const handleRecordSale = async (e) => {
    e.preventDefault();
    if (!saleForm.product_id || !saleForm.quantity) {
      toast.error("Please select a product and quantity.");
      return;
    }
    const product = products.find((p) => p.id === saleForm.product_id);
    if (!product) return;

    const total = parseFloat(product.unit_cost) * parseInt(saleForm.quantity);
    const items = [
      {
        name: product.name,
        qty: parseInt(saleForm.quantity),
        price: product.unit_cost,
      },
    ];

    try {
      const res = await fetch(`${backendUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: saleForm.customer_id || null,
          items,
          total,
          business_id: user.business_id,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Sale recorded! Total: ₹${total.toFixed(2)}`);
        setSaleForm({ customer_id: "", product_id: "", quantity: "1" });
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to record order.");
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: user.business_id,
          config: smtpSettings,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("SMTP Configuration Saved!");
      }
    } catch (e) {
      toast.error("Failed to save configuration.");
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!reminderForm.what_to_remind || !reminderForm.contact_channel) {
      toast.error("Please fill message and contact field.");
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: user.business_id,
          title: reminderForm.title || "Custom Reminder",
          what_to_remind: reminderForm.what_to_remind,
          remind_who: reminderForm.remind_who,
          contact_channel: reminderForm.contact_channel,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Reminder Set! Action queued for approval.");
        setReminderForm({
          title: "",
          what_to_remind: "",
          remind_who: "Self",
          contact_channel: "",
        });
      }
    } catch (err) {
      toast.error("Failed to create reminder.");
    }
  };

  const handleCreateManualExpense = async (e) => {
    e.preventDefault();
    if (!expForm.title || !expForm.amount) {
      toast.error("Please fill expense details.");
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expForm,
          amount: parseFloat(expForm.amount),
          business_id: user.business_id,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Expense Logged successfully!");
        setExpForm({ title: "", category: "Rent", amount: "", date: "" });
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to log expense.");
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold tracking-wide">
            ERP Data Management
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "products"
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "customers"
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Customers
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "suppliers"
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Suppliers
          </button>
          <button
            onClick={() => setActiveTab("sale")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "sale"
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Record Sale
          </button>
          <button
            onClick={() => setActiveTab("smtp")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "smtp"
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Mail Settings
          </button>
          <button
            onClick={() => setActiveTab("reminder")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "reminder"
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Set Reminder
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "expenses"
                ? "bg-indigo-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Expenses
          </button>
        </div>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === "products" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Table */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Current Inventory Ledger
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Reorder Threshold</th>
                    <th className="p-3">Unit Cost</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {Array.isArray(products) &&
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-900/20">
                        <td className="p-3 font-semibold text-slate-200">
                          {p.name}
                        </td>
                        <td className="p-3 text-slate-300">
                          {p.current_stock} Units
                        </td>
                        <td className="p-3 text-slate-400">
                          {p.reorder_threshold} Units
                        </td>
                        <td className="p-3 text-slate-300">
                          ₹{p.unit_cost.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.current_stock < p.reorder_threshold
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {p.current_stock < p.reorder_threshold
                              ? "Low Stock"
                              : "Healthy"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form */}
          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Add New Product
            </h3>
            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={prodForm.name}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, name: e.target.value })
                  }
                  placeholder="e.g. Basmati Rice"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    value={prodForm.current_stock}
                    onChange={(e) =>
                      setProdForm({
                        ...prodForm,
                        current_stock: e.target.value,
                      })
                    }
                    placeholder="e.g. 50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Reorder Limit
                  </label>
                  <input
                    type="number"
                    value={prodForm.reorder_threshold}
                    onChange={(e) =>
                      setProdForm({
                        ...prodForm,
                        reorder_threshold: e.target.value,
                      })
                    }
                    placeholder="e.g. 15"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    value={prodForm.unit_cost}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, unit_cost: e.target.value })
                    }
                    placeholder="e.g. 120"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Supplier
                  </label>
                  <select
                    value={prodForm.supplier_id}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, supplier_id: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Supplier</option>
                    {Array.isArray(suppliers) &&
                      suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-4"
              >
                <Plus className="w-4 h-4" />
                Add to Inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === "customers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Customer Ledger Accounts
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <th className="p-3">Name</th>
                    <th className="p-3">Contact (Email)</th>
                    <th className="p-3">Outstanding Dues</th>
                    <th className="p-3">Last Order Date</th>
                    <th className="p-3">Consent Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {Array.isArray(customers) &&
                    customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/20">
                        <td className="p-3 font-semibold text-slate-200">
                          {c.name}
                        </td>
                        <td className="p-3 text-slate-400">
                          {c.contact_channel}
                        </td>
                        <td className="p-3 font-medium text-amber-400">
                          ₹{c.outstanding_due.toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-300">
                          {c.last_order_date || "No Orders"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              c.consent_status === "opted_in"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {c.consent_status === "opted_in"
                              ? "Notification Opt-in"
                              : "Opt-out"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Add New Customer
            </h3>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={custForm.name}
                  onChange={(e) =>
                    setCustForm({ ...custForm, name: e.target.value })
                  }
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Contact Email (for Receipts)
                </label>
                <input
                  type="email"
                  required
                  value={custForm.contact_channel}
                  onChange={(e) =>
                    setCustForm({
                      ...custForm,
                      contact_channel: e.target.value,
                    })
                  }
                  placeholder="e.g. customer@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Consent
                  </label>
                  <select
                    value={custForm.consent_status}
                    onChange={(e) =>
                      setCustForm({
                        ...custForm,
                        consent_status: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="opted_in">Opt-In</option>
                    <option value="not_asked">Not Asked</option>
                    <option value="opted_out">Opt-Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Initial Due (₹)
                  </label>
                  <input
                    type="number"
                    value={custForm.outstanding_due}
                    onChange={(e) =>
                      setCustForm({
                        ...custForm,
                        outstanding_due: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-4"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Registered Suppliers
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Supplier Email (for POs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {Array.isArray(suppliers) &&
                    suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-900/20">
                        <td className="p-3 font-semibold text-slate-200">
                          {s.name}
                        </td>
                        <td className="p-3 text-slate-400">
                          {s.contact_channel}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Add New Supplier
            </h3>
            <form onSubmit={handleAddSupplier} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  required
                  value={suppForm.name}
                  onChange={(e) =>
                    setSuppForm({ ...suppForm, name: e.target.value })
                  }
                  placeholder="e.g. Laxmi Rice Mill"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Supplier Email Address
                </label>
                <input
                  type="email"
                  required
                  value={suppForm.contact_channel}
                  onChange={(e) =>
                    setSuppForm({
                      ...suppForm,
                      contact_channel: e.target.value,
                    })
                  }
                  placeholder="e.g. order@laxmirice.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-4"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECORD SALE TAB */}
      {activeTab === "sale" && (
        <div className="max-w-xl mx-auto bg-slate-950/40 p-6 rounded-xl border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-400" />
            Record Transaction (New Sale Order)
          </h3>
          <form onSubmit={handleRecordSale} className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Customer (Optional)
              </label>
              <select
                value={saleForm.customer_id}
                onChange={(e) =>
                  setSaleForm({ ...saleForm, customer_id: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Walk-in Customer</option>
                {Array.isArray(customers) &&
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Select Product
                </label>
                <select
                  value={saleForm.product_id}
                  onChange={(e) =>
                    setSaleForm({ ...saleForm, product_id: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Product</option>
                  {Array.isArray(products) &&
                    products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.current_stock} units, ₹{p.unit_cost}
                        /unit)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={saleForm.quantity}
                  onChange={(e) =>
                    setSaleForm({ ...saleForm, quantity: e.target.value })
                  }
                  placeholder="1"
                  min="1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {saleForm.product_id && (
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-900 text-xs flex justify-between items-center text-slate-400 font-mono">
                <span>Calculated Total:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  ₹
                  {(
                    parseFloat(
                      products.find((p) => p.id === saleForm.product_id)
                        ?.unit_cost || 0,
                    ) * parseInt(saleForm.quantity || 0)
                  ).toFixed(2)}
                </span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 hover:scale-[1.01] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Book order & Update Inventory
            </button>
          </form>
        </div>
      )}

      {/* SMTP SETTINGS TAB */}
      {activeTab === "smtp" && (
        <div className="max-w-xl mx-auto bg-slate-950/40 p-6 rounded-xl border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Mail className="w-5 h-5" />
            <h3 className="text-sm font-semibold">
              SMTP Outgoing Email Settings
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Configure SMTP to send actual email notifications to suppliers and
            customers. If left blank, notifications will fall back to local
            logging inside <code>backend/sent_emails.log</code> without
            interrupting the application flow.
          </p>
          <form onSubmit={handleSaveSmtp} className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                Sender Email Address
              </label>
              <input
                type="email"
                value={smtpSettings.smtp_email}
                onChange={(e) =>
                  setSmtpSettings({
                    ...smtpSettings,
                    smtp_email: e.target.value,
                  })
                }
                placeholder="e.g. sender@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                App Password
              </label>
              <input
                type="password"
                value={smtpSettings.smtp_password}
                onChange={(e) =>
                  setSmtpSettings({
                    ...smtpSettings,
                    smtp_password: e.target.value,
                  })
                }
                placeholder="SMTP App Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5" />
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={smtpSettings.smtp_host}
                  onChange={(e) =>
                    setSmtpSettings({
                      ...smtpSettings,
                      smtp_host: e.target.value,
                    })
                  }
                  placeholder="smtp.gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Port
                </label>
                <input
                  type="text"
                  value={smtpSettings.smtp_port}
                  onChange={(e) =>
                    setSmtpSettings({
                      ...smtpSettings,
                      smtp_port: e.target.value,
                    })
                  }
                  placeholder="587"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-4"
            >
              <Check className="w-4 h-4" />
              Save Settings
            </button>
          </form>
        </div>
      )}

      {/* SET REMINDER TAB */}
      {activeTab === "reminder" && (
        <div className="max-w-xl mx-auto bg-slate-950/40 p-6 rounded-xl border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Bell className="w-5 h-5" />
            <h3 className="text-sm font-semibold">
              Set Operational Custom Reminder
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Create custom reminders that get processed by the AURA Copilot
            system. Clicking "✓ Execute" on the reminder drafts will push the
            alert email to the recipient address.
          </p>
          <form onSubmit={handleCreateReminder} className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Reminder Topic / Title
              </label>
              <input
                type="text"
                required
                value={reminderForm.title}
                onChange={(e) =>
                  setReminderForm({ ...reminderForm, title: e.target.value })
                }
                placeholder="e.g. Call supplier for rice shipment"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Recipient Type
                </label>
                <select
                  value={reminderForm.remind_who}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      remind_who: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Self">Self (Owner Alert)</option>
                  <option value="Customer">Customer Alert</option>
                  <option value="Supplier">Supplier Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Recipient Address / Email
                </label>
                <input
                  type="email"
                  required
                  value={reminderForm.contact_channel}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      contact_channel: e.target.value,
                    })
                  }
                  placeholder="e.g. target@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quick Contact autofill helpers */}
            {reminderForm.remind_who === "Customer" &&
              Array.isArray(customers) &&
              customers.length > 0 && (
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-900 text-[10px] text-slate-400 space-y-1">
                  <span className="font-bold uppercase tracking-wider block text-slate-500 mb-0.5">
                    Quick Fill Customer Contact:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setReminderForm((prev) => ({
                            ...prev,
                            contact_channel: c.contact_channel,
                          }))
                        }
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-800 rounded text-[10px] transition-all"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {reminderForm.remind_who === "Supplier" &&
              Array.isArray(suppliers) &&
              suppliers.length > 0 && (
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-900 text-[10px] text-slate-400 space-y-1">
                  <span className="font-bold uppercase tracking-wider block text-slate-500 mb-0.5">
                    Quick Fill Supplier Contact:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suppliers.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setReminderForm((prev) => ({
                            ...prev,
                            contact_channel: s.contact_channel,
                          }))
                        }
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-800 rounded text-[10px] transition-all"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                What to Remind (Message Body)
              </label>
              <textarea
                rows="3"
                required
                value={reminderForm.what_to_remind}
                onChange={(e) =>
                  setReminderForm({
                    ...reminderForm,
                    what_to_remind: e.target.value,
                  })
                }
                placeholder="Write the reminder contents..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-4"
            >
              <Plus className="w-4 h-4" />
              Set Reminder Action
            </button>
          </form>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === "expenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-in">
          {/* Table */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Business Expense Ledger
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <th className="p-3">Expense Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Amount (₹)</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {Array.isArray(expenses) && expenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="p-4 text-center text-slate-500"
                      >
                        No expenses recorded yet.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-900/20">
                        <td className="p-3 font-semibold text-slate-200">
                          {e.title}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              e.category === "Inventory Purchase"
                                ? "bg-blue-500/10 text-blue-400"
                                : e.category === "Rent"
                                  ? "bg-pink-500/10 text-pink-400"
                                  : e.category === "Utilities"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : e.category === "Salaries"
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {e.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 font-mono">
                          ₹{e.amount.toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {e.date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form */}
          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Log Manual Expense
            </h3>
            <form onSubmit={handleCreateManualExpense} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Expense Description
                </label>
                <input
                  type="text"
                  required
                  value={expForm.title}
                  onChange={(e) =>
                    setExpForm({ ...expForm, title: e.target.value })
                  }
                  placeholder="e.g. July Shop Rent"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={expForm.category}
                    onChange={(e) =>
                      setExpForm({ ...expForm, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={expForm.amount}
                    onChange={(e) =>
                      setExpForm({ ...expForm, amount: e.target.value })
                    }
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Date (Optional)
                </label>
                <input
                  type="date"
                  value={expForm.date}
                  onChange={(e) =>
                    setExpForm({ ...expForm, date: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-4"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                Log Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
