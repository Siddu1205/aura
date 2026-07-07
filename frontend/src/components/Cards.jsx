import React from 'react';
import { DollarSign, Package, AlertTriangle, Users, TrendingUp } from 'lucide-react';

export default function Cards({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Revenue Card */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-xl transition-all duration-300 hover:border-emerald-500/40">
        <div className="absolute top-0 right-0 h-1 bg-emerald-500 w-16 rounded-bl-full"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400 text-sm font-medium tracking-wide">Today's Revenue</span>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight">{stats.revenue.value}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            stats.revenue.is_positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
          }`}>
            <TrendingUp className="w-3.5 h-3.5" />
            {stats.revenue.growth}
          </span>
        </div>
      </div>

      {/* Inventory Card */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-xl transition-all duration-300 hover:border-blue-500/40">
        <div className="absolute top-0 right-0 h-1 bg-blue-500 w-16 rounded-bl-full"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400 text-sm font-medium tracking-wide">Total Inventory</span>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight">{stats.inventory.value}</span>
          {stats.inventory.low_stock_count > 0 ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {stats.inventory.low_stock_alert}
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
              Optimal Stock
            </span>
          )}
        </div>
      </div>

      {/* Pending Collections Card */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-xl transition-all duration-300 hover:border-amber-500/40">
        <div className="absolute top-0 right-0 h-1 bg-amber-500 w-16 rounded-bl-full"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400 text-sm font-medium tracking-wide">Pending Collections</span>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight">{stats.collections.value}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {stats.collections.customer_count}
          </span>
        </div>
      </div>
    </div>
  );
}
