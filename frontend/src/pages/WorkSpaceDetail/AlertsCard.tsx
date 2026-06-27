import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Workspace, AlertRule } from '../../types';
import { BellRing, Loader2, Plus, Trash2, ArrowRight, Zap, TrendingUp, Activity, Hash, AlertTriangle, RefreshCw } from 'lucide-react';
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRules = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const res = await api.get<AlertRule[]>(
        `/workspaces/${workspace.id}/alerts`,
        { signal }
      );
      setRules(res.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED') return;

        console.error("Failed to fetch alert rules", error.response?.data || error.message);
        setFetchError("Unable to load alert rules. Please try again.");
      } else {
        console.error("Failed to fetch alert rules", error);
        setFetchError("Unexpected error while loading alerts.");
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [workspace.id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRules(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchRules]);

  const handleDeleteRule = async (ruleId: string) => {
    if (deletingId === ruleId) return;

    setDeletingId(ruleId);
    const backup = rules;

    setRules(prev => prev.filter(r => r.id !== ruleId));

    try {
      await api.delete(`/alerts/${ruleId}`);
      toast.success("Rule removed", {
        style: { fontSize: '13px', background: '#334155', color: '#fff' },
        iconTheme: { primary: '#ef4444', secondary: '#fff' }
      });
    } catch (error) {
      console.error(error);
      setRules(backup);
      toast.error("Failed to delete rule");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    if (isToggling) return;

    setIsToggling(ruleId);

    setRules(prev =>
      prev.map(r =>
        r.id === ruleId ? { ...r, is_active: !r.is_active } : r
      )
    );

    try {
      await api.patch(`/alerts/${ruleId}/toggle`);
    } catch (error: unknown) {
      console.error("Failed to toggle rule", error);

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

      setRules(prev =>
        prev.map(r =>
          r.id === ruleId ? { ...r, is_active: !r.is_active } : r
        )
      );
    } finally {
      setIsToggling(null);
    }
  };

  const getConditionDisplay = (cond: string) => {
    switch (cond) {
      case 'greater_than': return { symbol: '>', label: 'Exceeds' };
      case 'less_than': return { symbol: '<', label: 'Drops below' };
      case 'equals': return { symbol: '=', label: 'Equals' };
      case 'not_equals': return { symbol: '≠', label: 'Not equal' };
      default: return { symbol: '→', label: cond.replace(/_/g, ' ') };
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
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
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col h-full font-sans group hover:shadow-md transition-all duration-300">

        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-50 text-amber-600 rounded-sm border border-amber-100 flex items-center justify-center shadow-sm">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-none">Smart Alerts</h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Anomaly detection & thresholds
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="group inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-sm text-[10px] sm:text-[11px] font-bold font-manrope tracking-widest transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:rotate-90" />
              <span className="hidden sm:inline">New Alert</span>
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 bg-slate-50/50 p-4 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 bg-white border border-slate-200 rounded-sm flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-sm bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                  <div className="w-10 h-5 bg-slate-200 rounded-sm" />
                </div>
              ))}
              <div className="flex items-center justify-center pt-2">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin mr-2" />
                <span className="text-xs text-slate-400 font-medium">Syncing rules...</span>
              </div>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-sm flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Failed to load alerts</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                {fetchError}
              </p>
              <button
                onClick={() => fetchRules()}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center h-full opacity-60 hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-sm flex items-center justify-center mb-4 shadow-sm">
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
                    className="group/item relative flex items-center justify-between p-2.5 sm:p-4 bg-white border border-slate-200 rounded-sm hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-300"
                  >
                    {/* LEFT: Info */}
                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                      
                      {/* ICON (smaller on mobile) */}
                      <div className="flex-shrink-0 w-7 h-7 sm:w-10 sm:h-10 rounded-sm bg-slate-50 border border-slate-100 flex items-center justify-center">
                        {getMetricIcon(rule.metric)}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
                        
                        {/* Column + Label */}
                        <div className="flex items-center gap-1 overflow-hidden">
                          <span
                            className="text-[13px] sm:text-sm font-bold text-slate-900 truncate tracking-tight"
                            title={rule.column_name}
                          >
                            {rule.column_name}
                          </span>
                          <span className="hidden sm:inline text-slate-300 font-light">•</span>
                          <span className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight">
                            {label}
                          </span>
                        </div>

                        {/* Logic Row */}
                        <div className="flex items-center gap-1.5 mt-0.5 sm:mt-0">
                          <span className="px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/60 whitespace-nowrap uppercase">
                            {rule.metric.replace('_', ' ')}
                          </span>

                          <ArrowRight className="hidden sm:block w-3 h-3 text-slate-300" />

                          <span className="font-mono text-[10px] sm:text-xs font-black text-slate-800 bg-amber-50/50 sm:bg-transparent px-1 py-0.5 sm:p-0 rounded border border-amber-100/50 sm:border-none">
                            {symbol} {rule.value}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Actions (compact on mobile) */}
                    <div className="flex items-center gap-2 sm:gap-5 ml-2 sm:ml-4">
                      {isOwner && (
                        <>
                          {/* MOBILE-OPTIMIZED TOGGLE */}
                          <button
  onClick={() => handleToggleRule(rule.id)}
  disabled={isToggling === rule.id}
  className={`
    relative inline-flex
    h-5 w-9
    sm:h-5 sm:w-9
    flex-shrink-0
    items-center
    rounded-md
    border border-slate-300
    transition-all duration-200
    ${
      rule.is_active
        ? "bg-emerald-500 border-emerald-500"
        : "bg-slate-200"
    }
    ${
      isToggling === rule.id
        ? "opacity-50 cursor-not-allowed"
        : "cursor-pointer active:scale-95"
    }
  `}
>
  <span
    className={`
      absolute top-0.5 left-0.5
      h-4 w-4
      rounded
      bg-white
      shadow-sm
      transition-transform duration-200 ease-in-out
      ${
        rule.is_active
          ? "translate-x-4"
          : "translate-x-0"
      }
    `}
  />
</button>

                          {/* DELETE (visible on mobile, hover-only on desktop) */}
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            disabled={deletingId === rule.id}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-all sm:opacity-0 sm:group-hover/item:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {deletingId === rule.id ? (
                              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
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

        {rules.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] font-medium text-slate-400 flex justify-between items-center">
            <span>Usage: {activeCount} / 10 active alerts</span>
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
