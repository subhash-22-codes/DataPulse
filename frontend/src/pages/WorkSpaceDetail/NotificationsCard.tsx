import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";

interface Props {
  workspaceId: string;
  currentUserId: string;
}

interface MemberSetting {
  user_id: string;
  name: string;
  email: string;
  email_notifications_enabled: boolean;
}

export default function NotificationsCard({
  workspaceId,
  currentUserId,
}: Props) {
  const [members, setMembers] = useState<MemberSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const startCooldown = () => {
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
  };

  const loadSettings = useCallback(async () => {
    try {
      setError(false);
      setLoading(true);

      const res = await api.get(
        `/workspaces/${workspaceId}/notification-settings`
      );

      setMembers(res.data);
    } catch {
      setError(true);
      toast.error("Unable to load notification settings.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  /* ---------- Optimistic Toggle ---------- */

  const toggleSelf = async (enabled: boolean) => {
    if (cooldown) {
      toast("Please wait before toggling again.");
      return;
    }

    // optimistic UI update
    setMembers(prev =>
      prev.map(m =>
        m.user_id === currentUserId
          ? { ...m, email_notifications_enabled: enabled }
          : m
      )
    );

    try {
      setSaving(true);

      await api.patch(
        `/workspaces/${workspaceId}/notification-settings`,
        { email_notifications_enabled: enabled }
      );

      toast.success(
        enabled
          ? "Email notifications enabled"
          : "Email notifications disabled"
      );

      startCooldown();
    } catch {
      toast.error("Failed to update preference.");
      loadSettings();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* ---------- Loading ---------- */

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 p-6 space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-56 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  /* ---------- Error ---------- */

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 p-6 text-center space-y-3">
        <div className="text-red-600 font-semibold">
          Failed to load notification settings
        </div>
        <button
          onClick={loadSettings}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const allDisabled = members.every(
    m => !m.email_notifications_enabled
  );

  /* ---------- UI ---------- */

  return (
    
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60">

      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-lg font-semibold">
          Workspace Email Notifications
        </h3>

        <p className="text-sm text-slate-500 mt-1">
          Receive alerts when workspace data changes or monitoring rules trigger.
        </p>
      </div>

      {/* My Setting */}
      <div className="p-6 border-b border-slate-100 space-y-4">
        {members
          .filter(m => m.user_id === currentUserId)
          .map(m => (
            <div key={m.user_id} className="space-y-3">

              <div>
                <div className="font-medium text-slate-800">
                  Your Notification Preference
                </div>
                 <div className="text-xs text-slate-500 mt-1">
                  Disable this if you do not want to receive workspace
                  notification emails.
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-600 max-w-xl leading-relaxed">
                  {cooldown
                    ? "Please wait..."
                    : m.email_notifications_enabled
                    ? "You will receive workspace alert emails."
                    : "You will not receive alerts and may miss important updates."}
                </span>


                <label
                  className={`flex items-center ${
                    saving || cooldown
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer focus:outline-none"
                    checked={m.email_notifications_enabled}
                    disabled={saving || cooldown}
                    onChange={() =>
                      toggleSelf(!m.email_notifications_enabled)
                    }
                  />

                  <div
                    className={`relative w-12 h-7 rounded-full transition-all duration-200
                      peer-focus:ring-2 peer-focus:ring-blue-400 peer-focus:ring-offset-2
                      ${
                        m.email_notifications_enabled
                          ? "bg-green-500"
                          : "bg-slate-300"
                      }
                    `}
                  >
                    <div
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-200
                        ${
                          m.email_notifications_enabled
                            ? "translate-x-5"
                            : ""
                        }
                      `}
                    />
                  </div>
                </label>
              </div>
            </div>
          ))}
      </div>

      {/* Team Status */}
      <div className="divide-y divide-slate-100">
        <div className="px-6 pt-4 pb-2 text-sm font-semibold text-slate-600">
          Team Notification Status
        </div>

        {members.map(m => (
          <div
            key={m.user_id}
            className="px-6 py-4 space-y-1 sm:flex sm:items-center sm:justify-between sm:space-y-0"
          >
            <div>
              <div className="font-medium text-slate-800">
                {m.name}{" "}
                {m.user_id === currentUserId && (
                  <span className="text-blue-600">(You)</span>
                )}
              </div>

              <div className="text-sm text-slate-500 break-all">
                {m.email}
              </div>
            </div>

            <div className="text-sm text-slate-600">
              {m.email_notifications_enabled
                ? "Receiving alert emails"
                : "Alerts paused"}
            </div>
          </div>
        ))}
      </div>

      {allDisabled && (
        <div className="border-t border-slate-100 p-6">
          <div className="m-5 sm:m-6 p-4 border border-amber-200 bg-amber-50 rounded-md text-sm text-amber-900">
            All members have disabled notifications. Important alerts may go
            unnoticed.
          </div>
        </div>
      )}
    </div>
  );
}
