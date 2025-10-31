import React, { Fragment, useEffect, useState, useCallback } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bell, Loader2, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
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
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [loadingInsights, setLoadingInsights] = useState<Set<string>>(new Set());

 const fetchNotifications = useCallback(async () => {
  if (!token) return;
  if (notifications.length === 0) setIsLoading(true);
  try {
    const res = await api.get<Notification[]>('/notifications/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(res.data);
  } catch (error) {
    console.error("Failed to fetch notifications", error);
  } finally {
    setIsLoading(false);
  }
}, [token, notifications.length]); // 👈 dependencies used inside function

useEffect(() => {
  fetchNotifications();
  const interval = setInterval(fetchNotifications, 60000);
  return () => clearInterval(interval);
}, [fetchNotifications]); // 👈 add it here


  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await api.post('/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.log(error);
      setNotifications(prev =>
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: false } : n)
      );
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const originalNotifications = notifications;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    try {
      await api.delete(`/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Failed to delete notification", error);
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
        setLoadingInsights(loadingSet => {
          const newLoadingSet = new Set(loadingSet);
          newLoadingSet.add(notificationId);
          return newLoadingSet;
        });

        setTimeout(() => {
          setLoadingInsights(loadingSet => {
            const newLoadingSet = new Set(loadingSet);
            newLoadingSet.delete(notificationId);
            return newLoadingSet;
          });
        }, 800);
      }
      return newSet;
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover className="relative">
      {({ open }) => {
        if (open && unreadCount > 0) {
          handleMarkAllRead();
        }
        return (
          <>
            <Popover.Button className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none transition-all duration-200">
              <span className="sr-only">View notifications</span>
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-blue-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-1 scale-95"
            >
              <Popover.Panel className="fixed inset-x-0 top-16 mx-auto z-50 w-[calc(100%-1rem)] max-w-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[420px] md:max-w-lg md:w-[480px]">
                <div className="rounded-xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden max-h-[calc(100vh-5rem)] sm:max-h-none flex flex-col">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3.5 sm:p-5 flex-shrink-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-full border border-white/30">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 overscroll-contain">
                    {isLoading ? (
                      <div className="flex flex-col justify-center items-center p-10 sm:p-16">
                        <Loader2 className="animate-spin h-7 w-7 sm:h-8 sm:w-8 text-blue-500 mb-3" />
                        <p className="text-xs sm:text-sm text-gray-500">Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-10 sm:p-16">
                        <div className="bg-gray-100 rounded-full p-3 sm:p-4 mb-3 sm:mb-4">
                          <Bell className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400" />
                        </div>
                        <p className="text-center text-xs sm:text-sm font-medium text-gray-900 mb-1">
                          All caught up!
                        </p>
                        <p className="text-center text-[11px] sm:text-xs text-gray-500">
                          You have no new notifications.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <li
                            key={notification.id}
                            className={`group transition-all duration-200 ${
                              !notification.is_read
                                ? 'bg-blue-50/50 hover:bg-blue-50'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="p-3 sm:p-4">
                              <div className="flex justify-between items-start gap-2 sm:gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-1.5 sm:gap-2">
                                    {!notification.is_read && (
                                      <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0 animate-pulse"></span>
                                    )}
                                    <p className={`text-xs sm:text-sm leading-relaxed break-words ${
                                      notification.is_read
                                        ? 'text-gray-600'
                                        : 'text-gray-900 font-medium'
                                    }`}>
                                      {notification.message}
                                    </p>
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5 sm:mt-2 flex items-center gap-1 ml-3.5 sm:ml-4">
                                    <span className="inline-block w-1 h-1 bg-gray-400 rounded-full"></span>
                                    {new Date(notification.created_at).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>

                                <button
                                  onClick={() => handleDeleteNotification(notification.id)}
                                  title="Delete notification"
                                  className="flex-shrink-0 p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 active:scale-95"
                                >
                                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </button>
                              </div>

                              {notification.ai_insight && (
                                <div className="mt-2.5 sm:mt-3">
                                  <button
                                    onClick={() => toggleInsight(notification.id)}
                                    className="w-full flex items-center justify-between gap-2 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 hover:from-purple-100 hover:via-blue-100 hover:to-indigo-100 border border-purple-200/50 rounded-lg p-2.5 sm:p-3 transition-all duration-300 group/insight active:scale-[0.98]"
                                  >
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-md sm:rounded-lg p-1 sm:p-1.5 flex-shrink-0">
                                        <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                                      </div>
                                      <span className="text-[11px] sm:text-xs font-semibold bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent">
                                        AI Insight Available
                                      </span>
                                    </div>
                                    {expandedInsights.has(notification.id) ? (
                                      <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 transition-transform flex-shrink-0" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 transition-transform group-hover/insight:translate-y-0.5 flex-shrink-0" />
                                    )}
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
                                    <div className="overflow-hidden mt-2">
                                      <div className="bg-white border border-purple-200/50 rounded-lg p-3 sm:p-4 shadow-sm">
                                        {loadingInsights.has(notification.id) ? (
                                          <div className="flex flex-col items-center justify-center py-6 sm:py-8">
                                            <div className="relative">
                                              <Loader2 className="animate-spin h-7 w-7 sm:h-8 sm:w-8 text-purple-500" />
                                              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-gray-500 mt-2.5 sm:mt-3 animate-pulse">
                                              Generating insights...
                                            </p>
                                          </div>
                                        ) : (
                                          <div
                                            className="prose prose-xs sm:prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:text-xs sm:prose-headings:text-sm prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-xs sm:prose-p:text-sm prose-strong:text-purple-700 prose-strong:font-semibold prose-ul:text-gray-700 prose-li:text-gray-700 prose-li:text-xs sm:prose-li:text-sm prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1 sm:prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:text-[10px] sm:prose-code:text-xs"
                                            dangerouslySetInnerHTML={{ __html: notification.ai_insight }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </Transition>
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="bg-gray-50 border-t border-gray-100 p-2.5 sm:p-3 flex-shrink-0">
                      <p className="text-center text-[10px] sm:text-xs text-gray-500">
                        {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'} total
                      </p>
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
