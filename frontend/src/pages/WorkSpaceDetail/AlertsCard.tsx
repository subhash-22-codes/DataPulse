import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Workspace, AlertRule } from '../../types';
import { BellRing, Loader2, Plus, Trash2, ArrowRight, Zap, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { CreateAlertModal } from './CreateAlertModal';

interface AlertsCardProps {
  workspace: Workspace;
  isOwner: boolean;
}

export const AlertsCard: React.FC<AlertsCardProps> = ({ workspace, isOwner }) => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // 🎨 VISUAL HELPER: Convert text conditions to crisp symbols
  const getConditionDisplay = (cond: string) => {
    switch(cond) {
        case 'greater_than': return { symbol: '>', label: 'Exceeds' };
        case 'less_than': return { symbol: '<', label: 'Drops below' };
        case 'equals': return { symbol: '=', label: 'Equals' };
        case 'not_equals': return { symbol: '≠', label: 'Not equal' };
        default: return { symbol: '→', label: cond.replace(/_/g, ' ') };
    }
  };

  // 🎨 VISUAL HELPER: Get icon based on metric
  const getMetricIcon = (metric: string) => {
      if (metric === 'z_score' || metric === 'anomaly') return <Zap className="w-4 h-4 text-amber-500" />;
      if (metric === 'missing_count') return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      return <TrendingUp className="w-4 h-4 text-blue-500" />;
  };

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
            <div className="space-y-2">
              {rules.map((rule) => {
                const { symbol, label } = getConditionDisplay(rule.condition);
                return (
                  <div
                    key={rule.id}
                    className="group/item relative flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200"
                  >
                    {/* Main Logic */}
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      
                      {/* Icon */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center group-hover/item:bg-white group-hover/item:border-slate-200 transition-colors">
                          {getMetricIcon(rule.metric)}
                      </div>

                      {/* Text Content */}
                      <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 text-sm text-slate-900">
                             <span className="font-bold truncate max-w-[120px]" title={rule.column_name}>
                                {rule.column_name}
                             </span>
                             <span className="text-slate-300 font-light text-xs px-0.5">•</span>
                             <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                {label}
                             </span>
                          </div>
                          
                          {/* Logic Badge Row */}
                          <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  {rule.metric.replace('_', ' ')}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-300" />
                              <span className="font-mono font-bold text-slate-800 text-xs">
                                 {symbol} {rule.value}
                              </span>
                          </div>
                      </div>
                    </div>

                    {/* Right Side: Delete Action (Reveal on Hover) */}
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover/item:opacity-100 transition-all duration-200 transform translate-x-2 group-hover/item:translate-x-0"
                        title="Remove Alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Status Indicator (Purely Visual) */}
                    <div className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover/item:opacity-0 transition-opacity"></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer Meta */}
        {rules.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] font-medium text-slate-400 flex justify-between items-center">
                <span>{rules.length} active monitors</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> System operational</span>
            </div>
        )}
      </div>

      <CreateAlertModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        workspaceId={workspace.id}
        onRuleCreated={fetchRules}
      />
    </>
  );
};