import React, { Fragment, useEffect, useState, useCallback } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bell, Loader2, Trash2, Sparkles, ChevronDown, ChevronUp, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  workspace_id?: string;
  ai_insight?: string | null;
}

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [loadingInsights, setLoadingInsights] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    if (notifications.length === 0) setIsLoading(true);
    try {
      const res = await api.get<Notification[]>('/notifications/');
      setNotifications(res.data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, notifications.length]); 

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchNotifications, user]); 

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await api.post('/notifications/read-all');
    } catch (error) {
      console.error(error);
      setNotifications(prev =>
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: false } : n)
      );
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const originalNotifications = notifications;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error(error);
      setNotifications(originalNotifications);
    }
  };

  const toggleInsight = (notificationId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
        setLoadingInsights(prev => new Set(prev).add(notificationId));
        setTimeout(() => {
          setLoadingInsights(prev => {
            const next = new Set(prev);
            next.delete(notificationId);
            return next;
          });
        }, 800);
      }
      return newSet;
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover className="relative z-50">
      {({ open }) => {
        // Mark read when opening (optional, depending on preference)
        if (open && unreadCount > 0) {
           handleMarkAllRead();
        }

        return (
          <>
            <Popover.Button className={`relative rounded-xl p-2 transition-all duration-200 outline-none ${open ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
              <Bell className={`h-5 w-5 ${open ? 'fill-current' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-white"></span>
                </span>
              )}
            </Popover.Button>

            {/* Use fixed overlay on mobile to darken background (optional, adds focus) */}
            <Transition
                as={Fragment}
                enter="transition duration-200 ease-out"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition duration-150 ease-in"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] sm:hidden" aria-hidden="true" />
            </Transition>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-95"
            >
              {/* SUPER RESPONSIVE POSITIONING:
                  - Mobile (< sm): fixed inset-x-4 top-20 (Floats in center top of screen)
                  - Desktop (>= sm): absolute right-0 top-full (Standard dropdown)
              */}
              <Popover.Panel className="
                fixed inset-x-4 top-20 z-50 mt-0 
                sm:absolute sm:right-0 sm:top-full sm:mt-3 sm:inset-auto sm:w-[400px] 
              ">
                <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5 max-h-[calc(100vh-10rem)]">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                  </div>

                  {/* List - with custom scrollbar hiding/styling */}
                  <div className="overflow-y-auto overscroll-contain bg-white scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3 opacity-50" />
                        <p className="text-xs text-gray-400 font-medium">Updating feed...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="bg-gray-50 rounded-full p-4 mb-3">
                           <CheckCheck className="h-6 w-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">All caught up</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                          No new notifications.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-50">
                        {notifications.map((notification) => (
                          <li 
                            key={notification.id} 
                            className={`group relative p-4 transition-all duration-200 hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50/30' : 'bg-white'}`}
                          >
                            <div className="flex gap-3 items-start">
                              <div className="flex-shrink-0 mt-1">
                                {!notification.is_read ? (
                                  <div className="h-2 w-2 rounded-full bg-blue-600 ring-4 ring-blue-50"></div>
                                ) : (
                                  <div className="h-2 w-2 rounded-full bg-gray-200"></div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${!notification.is_read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                  {notification.message}
                                </p>
                                
                                <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                                  {new Date(notification.created_at).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                  })}
                                </p>

                                {notification.ai_insight && (
                                  <div className="mt-3">
                                    <button
                                      onClick={() => toggleInsight(notification.id)}
                                      className={`
                                        flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 border
                                        ${expandedInsights.has(notification.id) 
                                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                          : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200 hover:text-purple-600 hover:shadow-sm'
                                        }
                                      `}
                                    >
                                      <Sparkles className={`h-3 w-3 ${expandedInsights.has(notification.id) ? 'fill-purple-300' : ''}`} />
                                      {expandedInsights.has(notification.id) ? 'Hide Insight' : 'AI Insight'}
                                      {expandedInsights.has(notification.id) ? <ChevronUp className="h-3 w-3 ml-1 opacity-50" /> : <ChevronDown className="h-3 w-3 ml-1 opacity-50" />}
                                    </button>

                                    <Transition
                                      show={expandedInsights.has(notification.id)}
                                      enter="transition-all duration-300 ease-out"
                                      enterFrom="opacity-0 max-h-0"
                                      enterTo="opacity-100 max-h-[500px]"
                                      leave="transition-all duration-200 ease-in"
                                      leaveFrom="opacity-100 max-h-[500px]"
                                      leaveTo="opacity-0 max-h-0"
                                    >
                                      <div className="mt-2 overflow-hidden">
                                        <div className="bg-gradient-to-br from-purple-50/50 to-white border border-purple-100 rounded-xl p-3.5 shadow-sm">
                                          {loadingInsights.has(notification.id) ? (
                                            <div className="flex items-center gap-2 py-2">
                                              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
                                              <span className="text-xs text-purple-600 font-medium">Analyzing...</span>
                                            </div>
                                          ) : (
                                            <div 
                                              className="prose prose-xs max-w-none prose-p:text-gray-600 prose-headings:text-gray-800 prose-strong:text-purple-700 prose-a:text-purple-600"
                                              dangerouslySetInnerHTML={{ __html: notification.ai_insight }}
                                            />
                                          )}
                                        </div>
                                      </div>
                                    </Transition>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                // Mobile: Always visible (opacity-100). Desktop: Visible on hover (group-hover:opacity-100).
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all duration-200"
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                     <div className="bg-gray-50/80 backdrop-blur-sm border-t border-gray-100 p-2 text-center text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                       AI Powered Updates
                     </div>
                  )}

                </div>
              </Popover.Panel>
            </Transition>
          </>
        );
      }}
    </Popover>
  );
};