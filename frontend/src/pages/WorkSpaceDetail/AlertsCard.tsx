import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Workspace, AlertRule } from '../../types';
import { Bell, BellRing, Loader2, Plus, Trash2, Activity, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { CreateAlertModal } from './CreateAlertModal';
import { EmptyState } from '../../components/EmptyState';

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
    setRules(prev => prev.filter(r => r.id !== ruleId));
    try {
      await api.delete(`/alerts/${ruleId}`);
      toast.success("Alert rule deleted.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete rule.");
      setRules(originalRules);
    }
  };

  // Helper to make condition text pretty (e.g. "greater_than" -> "Greater Than")
  const formatCondition = (cond: string) => {
    return cond.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
        {/* Header Section */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Smart Alerts</h2>
              <p className="text-sm text-gray-500">Monitor metrics and get notified automatically</p>
            </div>
          </div>
          
          {isOwner && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="group inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span className="hidden sm:inline">New Alert</span>
            </button>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-500">Loading your rules...</p>
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              Icon={Bell}
              title="No alerts configured"
              message="Create alert rules to track anomalies in your data automatically."
              actionText={isOwner ? "Create Alert" : undefined}
              onAction={isOwner ? () => setIsModalOpen(true) : undefined}
            />
          ) : (
            <div className="grid gap-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="group relative flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-200"
                >
                  {/* Left Side: Icon & Rule Sentence */}
                  <div className="flex items-center gap-4">
                    {/* Visual Indicator of Rule Type */}
                    <div className="hidden sm:flex w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 items-center justify-center text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                        <Activity className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col">
                        {/* The Logic Sentence - Styled with Badges for readability */}
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span>If</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-medium font-mono text-xs">
                                {rule.metric}
                            </span>
                            <span>of</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 font-medium font-mono text-xs">
                                {rule.column_name}
                            </span>
                            <span className="text-gray-400">
                                <ArrowRight className="w-3 h-3" />
                            </span>
                            <span className="font-medium text-gray-900">
                                {formatCondition(rule.condition)}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-bold font-mono text-xs">
                                {rule.value}
                            </span>
                        </div>
                    </div>
                  </div>

                  {/* Right Side: Actions */}
                  {isOwner && (
                    <div className="flex items-center pl-4">
                        <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                        title="Delete alert rule"
                        >
                        <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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