import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Workspace, AlertRule } from '../../types';
import { BellRing, Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CreateAlertModal } from './CreateAlertModal';
import { EmptyState } from '../../components/EmptyState'; // <-- NEW Import

interface AlertsCardProps {
  workspace: Workspace;
  isOwner: boolean;
}

export const AlertsCard: React.FC<AlertsCardProps> = ({ workspace, isOwner }) => {
  const { token } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

const fetchRules = useCallback(async () => {
  if (rules.length === 0) setIsLoading(true); 
  try {
    const res = await api.get<AlertRule[]>(`/workspaces/${workspace.id}/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRules(res.data);
  } catch (error) {
    console.error("Failed to fetch alert rules", error);
  } finally {
    setIsLoading(false);
  }
}, [workspace.id, token, rules.length]);

useEffect(() => {
  fetchRules();
}, [fetchRules]); 


  const handleDeleteRule = async (ruleId: string) => {
    const originalRules = rules;
    setRules(prev => prev.filter(r => r.id !== ruleId));
    try {
      await api.delete(`/alerts/${ruleId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Alert rule deleted.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete rule.");
      setRules(originalRules);
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Smart Alerts</h2>
                <p className="text-xs text-gray-600 mt-0.5">Get notified when metrics change</p>
              </div>
            </div>
           {isOwner && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Alert</span>
            </button>
          )}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Loading alerts...</p>
            </div>
          ) : rules.length === 0 ? (
            // --- THIS IS THE CHANGE ---
            // We now use our beautiful, reusable EmptyState component
            <EmptyState
              Icon={BellRing}
              title="No Smart Alerts Yet"
              message="Create your first alert to get notified about important changes in your data."
              actionText={isOwner ? "Create New Alert" : undefined}
              onAction={isOwner ? () => setIsModalOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div 
                  key={rule.id} 
                  className="group flex items-start justify-between gap-4 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors duration-150"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BellRing className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Alert when <span className="font-semibold text-gray-900">{rule.metric}</span> of{' '}
                        <span className="font-semibold text-gray-900">{rule.column_name}</span> is{' '}
                        <span className="font-medium text-blue-600">{rule.condition.replace('_', ' ')}</span>{' '}
                        <span className="font-semibold text-gray-900">{rule.value}</span>
                      </p>
                    </div>
                  </div>
                  {isOwner && (
                    <button 
                      onClick={() => handleDeleteRule(rule.id)} 
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100"
                      title="Delete alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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