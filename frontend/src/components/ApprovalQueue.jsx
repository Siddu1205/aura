import React, { useState } from 'react';
import { ShoppingCart, MessageSquare, Heart, Check, X, ShieldAlert, AlertCircle, DollarSign, Layers } from 'lucide-react';

export default function ApprovalQueue({ actions, onExecute, onIgnore }) {
  const proposedActions = actions.filter(act => act.status === 'proposed');
  
  // Modal state
  const [confirmingAction, setConfirmingAction] = useState(null);
  const [logAsExpense, setLogAsExpense] = useState(true);
  const [restockForm, setRestockForm] = useState({ qty_received: 50, actual_cost: 0 });
  const [collectionsForm, setCollectionsForm] = useState({ amount_paid: 0 });

  const getAgentHeader = (agentType) => {
    switch (agentType) {
      case 'restock':
        return {
          title: 'Purchase Order Draft',
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          icon: <ShoppingCart className="w-4 h-4" />
        };
      case 'collections':
        return {
          title: 'Payment Reminder Draft',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          icon: <MessageSquare className="w-4 h-4" />
        };
      case 'winback':
        return {
          title: 'Winback Offer Draft',
          color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
          icon: <Heart className="w-4 h-4" />
        };
      case 'custom_reminder':
        return {
          title: 'Custom User Reminder',
          color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
          icon: <AlertCircle className="w-4 h-4" />
        };
      default:
        return {
          title: 'AI Proposed Action',
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          icon: <Check className="w-4 h-4" />
        };
    }
  };

  const handleOpenConfirm = (act) => {
    setConfirmingAction(act);
    if (act.agent_type === 'restock') {
      const recQty = act.action?.recommended_quantity || 50;
      setRestockForm({
        qty_received: recQty,
        // Assume default unit price ₹80 for estimation
        actual_cost: recQty * 80
      });
    } else if (act.agent_type === 'collections') {
      // Extract dues from trigger reason if possible
      let extractedDue = 500;
      const parts = act.trigger_reason.split("due of ₹");
      if (parts.length > 1) {
        try {
          extractedDue = parseFloat(parts[1].split(" ")[0]);
        } catch (e) {}
      }
      setCollectionsForm({ amount_paid: extractedDue });
    }
  };

  const submitExecutionConfirm = () => {
    if (!confirmingAction) return;

    let payload = {};
    if (confirmingAction.agent_type === 'restock') {
      payload = {
        qty_received: parseInt(restockForm.qty_received),
        actual_cost: parseFloat(restockForm.actual_cost),
        log_as_expense: logAsExpense
      };
    } else if (confirmingAction.agent_type === 'collections') {
      payload = {
        amount_paid: parseFloat(collectionsForm.amount_paid)
      };
    }

    onExecute(confirmingAction.id, payload);
    setConfirmingAction(null);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[500px]">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold tracking-wide">Approval Queue</h2>
        </div>
        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          {proposedActions.length} Pending
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {proposedActions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Check className="w-10 h-10 text-emerald-400 stroke-[1.5]" />
            <p className="text-sm">Queue Clear. No pending approvals!</p>
          </div>
        ) : (
          proposedActions.map((act) => {
            const header = getAgentHeader(act.agent_type);
            
            return (
              <div 
                key={act.id} 
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700/60 transition-all duration-300 animate-slide-in space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg border ${header.color}`}>
                      {header.icon}
                    </div>
                    <span className="text-sm font-semibold text-slate-200">{header.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Mode: {act.mode.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  <div className="text-slate-500 font-bold mb-1">TRIGGER:</div>
                  <p className="bg-slate-950/80 p-2 rounded border border-slate-900/50 mb-2 font-sans text-slate-300">
                    {act.trigger_reason}
                  </p>

                  <div className="text-slate-500 font-bold mb-1">PROPOSED AI ACTION:</div>
                  {act.agent_type === 'restock' && (
                    <p className="bg-slate-950/80 p-3 rounded border border-slate-900/50 italic">
                      "{act.action?.supplier_message}"
                    </p>
                  )}
                  {act.agent_type === 'collections' && (
                    <p className="bg-slate-950/80 p-3 rounded border border-slate-900/50 italic">
                      "{act.action?.reminder_message}"
                    </p>
                  )}
                  {act.agent_type === 'winback' && (
                    <p className="bg-slate-950/80 p-3 rounded border border-slate-900/50 italic">
                      "{act.action?.winback_message}"
                    </p>
                  )}
                  {act.agent_type === 'custom_reminder' && (
                    <div className="bg-slate-950/80 p-3 rounded border border-slate-900/50 text-left space-y-1">
                      <p className="text-slate-300 italic">"{act.action?.message}"</p>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-900">
                        To: {act.action?.recipient} ({act.action?.type})
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  {act.agent_type === 'winback' || act.agent_type === 'custom_reminder' ? (
                    <button 
                      onClick={() => onExecute(act.id, {})}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 hover:border-emerald-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 shadow-lg"
                    >
                      <Check className="w-4 h-4" />
                      ✓ Execute
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleOpenConfirm(act)}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 hover:border-emerald-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 shadow-lg"
                    >
                      <Check className="w-4 h-4" />
                      ✓ Execute
                    </button>
                  )}
                  
                  <button 
                    onClick={() => onIgnore(act.id)}
                    className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                    ✕ Ignore
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4 animate-slide-in">
            <div className="flex items-center gap-2 text-indigo-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-wide uppercase">Operational Execution Update</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Confirming transaction parameters. AURA will adjust inventory/ledger data and dispatch outgoing email receipts.
            </p>

            {confirmingAction.agent_type === 'restock' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    Actual Quantity Received
                  </label>
                  <input 
                    type="number"
                    value={restockForm.qty_received}
                    onChange={e => setRestockForm({...restockForm, qty_received: e.target.value})}
                    placeholder="e.g. 50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Total Purchase Cost Paid (₹)
                  </label>
                  <input 
                    type="number"
                    value={restockForm.actual_cost}
                    onChange={e => setRestockForm({...restockForm, actual_cost: e.target.value})}
                    placeholder="e.g. 4000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox"
                    id="log_expense_check"
                    checked={logAsExpense}
                    onChange={e => setLogAsExpense(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                  />
                  <label htmlFor="log_expense_check" className="text-[11px] text-slate-400 font-medium cursor-pointer">
                    Log this purchase order as a Business Expense
                  </label>
                </div>
              </div>
            )}

            {confirmingAction.agent_type === 'collections' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Actual Amount Settled / Paid (₹)
                  </label>
                  <input 
                    type="number"
                    value={collectionsForm.amount_paid}
                    onChange={e => setCollectionsForm({...collectionsForm, amount_paid: e.target.value})}
                    placeholder="Enter amount paid"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={submitExecutionConfirm}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition-all"
              >
                Confirm & Dispatch
              </button>
              <button 
                onClick={() => setConfirmingAction(null)}
                className="py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
