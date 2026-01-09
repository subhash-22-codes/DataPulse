import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Bell, 
  Trash2, 
  ExternalLink, 
  Inbox, 
  Loader2, 
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FaStackOverflow } from 'react-icons/fa';
import ReactMarkdown from "react-markdown";
import { ModalShell } from './ModelShell';

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  priority: 'low' | 'info' | 'warning' | 'critical';
  action_url?: string;
  ai_insight?: string | null;
  created_at: string;
}

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get<Notification[]>('/notifications/');
      setNotifications(res.data);
      const hasUnread = res.data.some(n => !n.is_read);
      if (hasUnread) {
        await api.post('/notifications/read-all');
      }
    } catch (error) {
      console.error("Fetch failed", error);
      toast.error("Could not load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleDelete = async (id: string) => {
    setIsProcessing(id);
    const original = notifications;
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    try {
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      console.error("Delete failed", error);
      setNotifications(original);
      toast.error("Failed to delete");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteAll = async () => {
    setIsClearModalOpen(false); // Close the modal
    const original = [...notifications];
    setNotifications([]);

    try {
      await api.delete('/notifications/');
      toast.success("Inbox cleared");
    } catch (error) {
      console.error("Clear all failed", error);
      setNotifications(original);
      toast.error("Failed to clear inbox");
    }
  };
  const toggleInsight = (id: string) => {
    setExpandedInsights(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getPriorityStyles = (priority: string) => {
    switch(priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-amber-600 bg-amber-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[80vh] gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        <span className="text-xs font-medium text-slate-400">Loading updates...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 relative z-10">

        {/* --- BREADCRUMB --- */}
        <button 
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-[12px] font-semibold text-slate-400 hover:text-slate-900 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </button>
        
        {/* --- HEADER --- */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-[13px] text-slate-500 mt-1 font-medium">
              Manage updates and alerts for your account activity.
            </p>
          </div>
          
          <button 
            onClick={() => setIsClearModalOpen(true)}
            disabled={notifications.length === 0}
            className="w-fit flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-red-600 transition-all uppercase tracking-wider disabled:opacity-20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </button>
        </div>

        {/* --- LIST --- */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Inbox className="w-8 h-8 text-slate-200" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No new notifications</h3>
              <p className="text-xs text-slate-500 mt-1">We'll notify you when there's an update.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`group relative p-4 sm:p-6 transition-colors ${!n.is_read ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Compact Icon */}
                    <div className={`mt-0.5 p-2 rounded-md ${getPriorityStyles(n.priority)}`}>
                      {n.priority === 'critical' ? <AlertTriangle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1 pr-8">
                          <div className="flex items-center flex-wrap gap-2">
                            <p className={`text-[14px] leading-snug ${!n.is_read ? 'text-slate-900 font-semibold' : 'text-slate-600 font-medium'}`}>
                              {n.message}
                            </p>
                            {!n.is_read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.3)]" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {new Date(n.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>

                        {/* Actions: On mobile these are always visible, on desktop they appear on hover */}
                        <div className="flex items-center gap-1 mt-2 sm:mt-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {n.action_url && (
                            <a 
                              href={n.action_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button 
                            onClick={() => handleDelete(n.id)}
                            disabled={isProcessing === n.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          >
                            {isProcessing === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* AI Intelligence Block: Minimal and clean */}
                      {n.ai_insight && (
                        <div className="mt-4">
                          <button 
                            onClick={() => toggleInsight(n.id)}
                            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${expandedInsights.has(n.id) ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <Sparkles className="w-3 h-3" />
                            Insight
                            {expandedInsights.has(n.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {expandedInsights.has(n.id) && (
                            <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="prose prose-slate max-w-none text-[13px] text-slate-600 font-medium">
                                <ReactMarkdown>
                                  {n.ai_insight}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- FOOTER --- */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 opacity-50">
           <div className="flex items-center gap-2">
              <FaStackOverflow className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                notification center
              </p>
           </div>
        </div>
      </div>

     {isClearModalOpen && (
      <ModalShell>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6">
          {/* max-w-sm and p-4 make it feel much tighter and more "production" */}
          <div className="w-full max-w-[340px] rounded-sm border border-slate-300 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
            
            {/* Simple, direct header */}
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Empty inbox?
            </h3>
            
            {/* Minimalist body - no scary wording */}
            <p className="mt-2 text-xs text-slate-500 leading-normal font-medium">
              All your current notifications will be removed. You won't be able to see them again.
            </p>

            {/* Compact Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors font-manrope hover:bg-black/5 tracking-widest"
              >
                Cancel
              </button>
              
              <button
                onClick={handleDeleteAll}
                className="rounded-sm bg-slate-900 px-4 py-1.5 text-[11px] font-bold text-white hover:bg-black shadow-sm transition-all font-manrope tracking-widest"
              >
                Clear Inbox
              </button>
            </div>

          </div>
        </div>
      </ModalShell>
    )}
    </div>
  );
};