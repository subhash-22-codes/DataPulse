import React, { Fragment, useEffect, useState, useCallback } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bell, Loader2, Inbox, ChevronRight, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  priority: string;
  created_at: string;
}

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<Notification[]>('/notifications/?limit=5');
      setNotifications(res.data);
    } catch (error) {
      console.error("Fetch failed", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, location.pathname]);

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); 
    const original = notifications;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error("Delete failed", error);
      setNotifications(original);
      toast.error("Error deleting");
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover className="relative">
      {/* --- ICON TRIGGER --- */}
     <Popover.Button className="relative p-2 text-slate-500 hover:text-slate-900 transition-all group">
        {/* The Bell - Standard size */}
        <Bell className="h-[18px] w-[18px]" />
        
        {/* The Micro-Badge - Shrunk and pushed to the edge */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-[6px] font-bold text-white ring-1 ring-white">
            {/* Optional: Only show number if you really need it, otherwise a plain dot is cleaner */}
            {unreadCount > 9 ? '!' : unreadCount}
          </span>
        )}

        {/* Micro Tooltip */}
        <div className="absolute top-[120%] left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50">
          <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mb-0.5"></div>
          <div className="bg-slate-800 text-white text-[9px] font-medium px-2 py-0.5 rounded-sm shadow-xl whitespace-nowrap">
            Notification center
          </div>
        </div>
      </Popover.Button>
      

      {/* --- MOBILE OVERLAY --- */}
      <Transition.Child
        as={Fragment}
        enter="duration-200 ease-out"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="duration-150 ease-in"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 z-[90] bg-slate-950/5 sm:hidden" />
      </Transition.Child>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-2 sm:translate-y-1 sm:scale-95"
        enterTo="opacity-100 translate-y-0 sm:scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
        leaveTo="opacity-0 translate-y-2 sm:translate-y-1 sm:scale-95"
      >
        <Popover.Panel 
          className="
            fixed inset-x-6 top-16 z-[100]           /* Mobile: Compact width, positioned higher */
            sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 /* Desktop: Anchor to bell */
            w-auto sm:w-80                           /* Smaller fixed width on desktop */
            bg-white rounded-lg shadow-xl ring-1 ring-black/5 overflow-hidden
          "
        >
          {({ close }) => (
            <div className="flex flex-col">
              {/* --- HEADER --- */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Notifications</span>
                <button onClick={() => close()} className="sm:hidden p-1 text-slate-300">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* --- SCROLLABLE LIST --- */}
              {/* Locked height: once 5 items are loaded, the scrollbar triggers */}
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar bg-white">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-200" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <Inbox className="h-6 w-6 text-slate-100 mb-2" />
                    <p className="text-[11px] text-slate-400">No new updates</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`group relative p-4 transition-colors hover:bg-slate-50 ${!n.is_read ? 'bg-blue-50/20' : ''}`}
                      >
                        <div className="flex gap-3 pr-6">
                          <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${!n.is_read ? 'bg-blue-600' : 'bg-slate-200'}`} />
                          <div className="min-w-0">
                            <p className="text-[12px] text-slate-700 leading-snug">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons appear on hover (desktop) or touch (mobile) */}
                        <button
                          onClick={(e) => handleDeleteNotification(e, n.id)}
                          className="absolute right-2 top-4 p-1.5 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- FOOTER --- */}
              <button
                onClick={() => {
                  navigate('/notifications');
                  close();
                }}
                className="flex items-center justify-center gap-1 w-full py-3 border-t border-slate-50 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
              >
                View all
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};