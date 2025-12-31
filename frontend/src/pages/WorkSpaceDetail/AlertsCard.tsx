import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Workspace, AlertRule } from '../../types';
import { BellRing, Loader2, Plus, Trash2, ArrowRight, Zap, TrendingUp, Activity, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { CreateAlertModal } from './CreateAlertModal';
import axios from 'axios'; 
interface AlertsCardProps {
  workspace: Workspace;
  isOwner: boolean;
}

export const AlertsCard: React.FC<AlertsCardProps> = ({ workspace, isOwner }) => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const fetchRules = useCallback(async () => {
    if (rules.length === 0) setIsLoading(true);
    try {
      const res = await api.get<AlertRule[]>(`/workspaces/${workspace.id}/alerts`);
      setRules(res.data);
    } catch (error) {
      console.error("Failed to fetch alert rules", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspace.id, rules.length]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleDeleteRule = async (ruleId: string) => {
    const originalRules = rules;
    // Optimistic UI update
    setRules(prev => prev.filter(r => r.id !== ruleId));
    try {
      await api.delete(`/alerts/${ruleId}`);
      toast.success("Rule removed", {
        style: { fontSize: '13px', background: '#334155', color: '#fff' },
        iconTheme: { primary: '#ef4444', secondary: '#fff' }
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete rule");
      setRules(originalRules);
    }
  };

  // Inside AlertsCard.tsx
const handleToggleRule = async (ruleId: string) => {
    if (isToggling) return;

    setIsToggling(ruleId);
    
    // 1. Optimistic Update
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, is_active: !r.is_active } : r
    ));

    try {
      // 2. Sync with Backend
      await api.patch(`/alerts/${ruleId}/toggle`);
    } catch (error: unknown) {
      console.error("Failed to toggle rule", error);
      
      // ✅ Type-safe error extraction using axios
      let errorMessage = "Failed to update status";
      if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.detail || errorMessage;
      }

      toast.error(errorMessage, {
          style: { 
            fontSize: '12px', 
            background: '#fee2e2', 
            color: '#991b1b', 
            border: '1px solid #fecaca' 
          }
      });

      // 3. Revert on failure
      setRules(prev => prev.map(r => 
        r.id === ruleId ? { ...r, is_active: !r.is_active } : r
      ));
    } finally {
      setIsToggling(null);
    }
  };

  // 🎨 VISUAL HELPER: Convert text conditions to crisp symbols
  const getConditionDisplay = (cond: string) => {
    switch(cond) {
        case 'greater_than': return { symbol: '>', label: 'Exceeds' };
        case 'less_than': return { symbol: '<', label: 'Drops below' };
        case 'equals': return { symbol: '=', label: 'Equals' };
        case 'not_equals': return { symbol: '≠', label: 'Not equal' }; // Ensure this matches Backend
        default: return { symbol: '→', label: cond.replace(/_/g, ' ') };
    }
};

  // 🎨 VISUAL HELPER: Get icon based on metric
  const getMetricIcon = (metric: string) => {
    switch(metric) {
        case 'mean':
        case '50%': 
            return <Activity className="w-4 h-4 text-blue-500" />;
        case 'max': 
            return <TrendingUp className="w-4 h-4 text-emerald-500" />;
        case 'min': 
            return <TrendingUp className="w-4 h-4 text-rose-500 rotate-180" />;
        case 'count': 
            return <Hash className="w-4 h-4 text-slate-500" />;
        default: 
            return <Zap className="w-4 h-4 text-amber-500" />;
    }
};
const activeCount = rules.filter(r => r.is_active).length;

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full font-sans group hover:shadow-md transition-all duration-300">
        
        {/* --- HEADER --- */}
        <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="flex-shrink-0 w-8 h-8 bg-amber-50 text-amber-600 rounded-md border border-amber-100 flex items-center justify-center shadow-sm">
                <BellRing className="w-4 h-4" />
             </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-none">Smart Alerts</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-slate-500 font-medium">Anomaly detection & thresholds</p>
              </div>
            </div>
          </div>
          
          {isOwner && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="group inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
              <span className="hidden sm:inline">New Alert</span>
            </button>
          )}
        </div>

        {/* --- CONTENT --- */}
        <div className="flex-1 bg-slate-50/50 p-4 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin mb-3" />
              <p className="text-xs font-medium text-slate-400">Syncing rules...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center h-full opacity-60 hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Activity className="h-5 w-5 text-slate-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No active alerts</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                Set up rules to get notified when your data changes unexpectedly.
              </p>
              {isOwner && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
                >
                  Configure first rule
                </button>
              )}
            </div>
          ) : (
           <div className="space-y-3">
              {rules.map((rule) => {
                const { symbol, label } = getConditionDisplay(rule.condition);
                return (
                  <div
                    key={rule.id}
                    className="group/item relative flex items-center justify-between p-3 sm:p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-300"
                  >
                    {/* LEFT: Information section (Adaptive Layout) */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* ICON: Square & Solid on Desktop, Smaller on Mobile */}
                      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center group-hover/item:bg-white group-hover/item:border-slate-200 transition-colors">
                        {getMetricIcon(rule.metric)}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
                        {/* Column & Condition Label */}
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="text-sm font-bold text-slate-900 truncate tracking-tight" title={rule.column_name}>
                            {rule.column_name}
                          </span>
                          <span className="hidden sm:inline text-slate-300 font-light">•</span>
                          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight sm:tracking-normal">
                            {label}
                          </span>
                        </div>
                        
                        {/* Logic Badge Row: Stays compact on Mobile, expands on Desktop */}
                        <div className="flex items-center gap-2 mt-1 sm:mt-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/60 whitespace-nowrap uppercase tracking-tighter sm:tracking-normal">
                            {rule.metric.replace('_', ' ')}
                          </span>
                          <ArrowRight className="hidden sm:block w-3 h-3 text-slate-300" />
                          <span className="font-mono text-[11px] sm:text-xs font-black text-slate-800 bg-amber-50/50 sm:bg-transparent px-1.5 py-0.5 sm:p-0 rounded border border-amber-100/50 sm:border-none">
                            {symbol} {rule.value}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Action Section (Fixed Width) */}
                    <div className="flex items-center gap-3 sm:gap-5 ml-4">
                      {isOwner && (
                        <>
                          {/* THE TOGGLE SWITCH */}
                          <button
                            onClick={() => handleToggleRule(rule.id)}
                            disabled={isToggling === rule.id}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-slate-400 focus:ring-offset-1 ${
                              rule.is_active ? 'bg-emerald-500' : 'bg-slate-200'
                            } ${
                              isToggling === rule.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                rule.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* DELETE BUTTON: Reveal only on Desktop Hover */}
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all sm:opacity-0 sm:group-hover/item:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer Meta */}
        {rules.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] font-medium text-slate-400 flex justify-between items-center">
                <span>Usage: {activeCount} / 10 active alerts</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> System operational</span>
            </div>
        )}
      </div>

      <CreateAlertModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        workspaceId={workspace.id}
        onRuleCreated={fetchRules}
        activeAlertsCount={activeCount}
      />
    </>
  );
};