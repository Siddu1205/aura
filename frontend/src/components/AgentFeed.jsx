import React, { useEffect, useState } from 'react';
import { ShoppingCart, MessageSquare, Heart, Phone, Sparkles, AlertCircle } from 'lucide-react';

// Relative time helper
function getRelativeTime(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return 'Recently';
  }
}

export default function AgentFeed({ actions }) {
  const [ticker, setTicker] = useState(0);

  // Force re-render of timestamps every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const getAgentConfig = (agentType) => {
    switch (agentType) {
      case 'restock':
        return {
          icon: <ShoppingCart className="w-5 h-5" />,
          title: 'Restock Agent',
          colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          badgeColor: 'bg-blue-500/10 text-blue-300'
        };
      case 'collections':
        return {
          icon: <MessageSquare className="w-5 h-5" />,
          title: 'Collections Agent',
          colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          badgeColor: 'bg-emerald-500/10 text-emerald-300'
        };
      case 'winback':
        return {
          icon: <Heart className="w-5 h-5" />,
          title: 'Winback Agent',
          colorClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
          badgeColor: 'bg-pink-500/10 text-pink-300'
        };
      case 'voice':
        return {
          icon: <Phone className="w-5 h-5" />,
          title: 'Voice Booking Agent',
          colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
          badgeColor: 'bg-violet-500/10 text-violet-300'
        };
      default:
        return {
          icon: <Sparkles className="w-5 h-5" />,
          title: 'AURA Agent',
          colorClass: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          badgeColor: 'bg-slate-500/10 text-slate-300'
        };
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[500px]">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold tracking-wide">Live Agent Activity</h2>
        </div>
        <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-800">
          Realtime Polling
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {actions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <AlertCircle className="w-10 h-10 stroke-[1.5]" />
            <p className="text-sm">No actions recorded. Try running a trigger helper!</p>
          </div>
        ) : (
          actions.map((act) => {
            const config = getAgentConfig(act.agent_type);
            const isExecuted = act.status === 'executed';
            const isIgnored = act.status === 'ignored';

            return (
              <div 
                key={act.id} 
                className="group relative flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/30 transition-all duration-300 animate-slide-in"
              >
                {/* Agent Icon Section */}
                <div className="flex items-start">
                  <div className={`p-3 rounded-xl border ${config.colorClass}`}>
                    {config.icon}
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start md:items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{config.title}</span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        isExecuted ? 'bg-emerald-500/10 text-emerald-400' :
                        isIgnored ? 'bg-slate-800 text-slate-400 line-through' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {act.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {getRelativeTime(act.created_at)}
                    </span>
                  </div>

                  {/* Trigger Reason */}
                  <p className="text-sm font-medium text-slate-300">
                    {act.trigger_reason}
                  </p>

                  {/* Render Message Body based on Agent Type */}
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-900/80 text-xs text-slate-400 space-y-1 font-mono break-all max-w-full">
                    {act.agent_type === 'restock' && (
                      <>
                        <div className="text-blue-400 font-semibold mb-1">DRAFT PO MESSAGE:</div>
                        <p className="text-slate-300 italic">"{act.action.supplier_message}"</p>
                        <div className="mt-2 text-[10px] text-slate-500">
                          Qty Ordered: {act.action.recommended_quantity} | Urgency: {act.action.urgency}
                        </div>
                      </>
                    )}
                    {act.agent_type === 'collections' && (
                      <>
                        <div className="text-emerald-400 font-semibold mb-1">DRAFT DUES REMINDER:</div>
                        <p className="text-slate-300 italic">"{act.action.reminder_message}"</p>
                        <div className="mt-2 text-[10px] text-slate-500">
                          Tone: {act.action.tone}
                        </div>
                      </>
                    )}
                    {act.agent_type === 'winback' && (
                      <>
                        <div className="text-pink-400 font-semibold mb-1">DRAFT OFFER DRAFT:</div>
                        <p className="text-slate-300 italic">"{act.action.winback_message}"</p>
                        <div className="mt-2 text-[10px] text-slate-500">
                          Promo: {act.action.promo_code}
                        </div>
                      </>
                    )}
                    {act.agent_type === 'voice' && (
                      <>
                        <div className="text-violet-400 font-semibold mb-1">CONFIRMED BOOKING DETAILS:</div>
                        <p className="text-slate-300">"{act.action.message}"</p>
                        {act.action.items && (
                          <div className="mt-2 space-y-1">
                            <div className="text-[10px] text-slate-500">ITEMS:</div>
                            {act.action.items.map((item, idx) => (
                              <div key={idx} className="text-slate-400 ml-2">
                                - {item.name} x{item.qty} (₹{item.unit_price}/unit)
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 text-[10px] text-slate-500">
                          Total: ₹{act.action.total}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Language Source Indicator */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      act.language_source === 'llm' 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {act.language_source === 'llm' ? '✨ LLM Phrased' : '📋 Template Fallback'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
