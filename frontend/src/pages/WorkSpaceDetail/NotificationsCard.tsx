import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";

/* =======================
   Types
======================= */

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

/* =======================
   Component
======================= */

export default function NotificationsCard({
  workspaceId,
  currentUserId,
}: Props) {
  /* ---------- State ---------- */

  const [members, setMembers] = useState<MemberSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  /* ---------- Cooldown ---------- */

  const startCooldown = () => {
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
  };

  /* ---------- Fetch ---------- */

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

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* ---------- Actions ---------- */

  const toggleSelf = async (enabled: boolean) => {
    if (cooldown) {
      toast("Please wait before toggling again.");
      return;
    }

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

  /* ---------- Derived ---------- */

  const self = members.find(m => m.user_id === currentUserId);

  const allDisabled =
    members.length > 0 &&
    members.every(m => !m.email_notifications_enabled);

  /* ---------- Loading ---------- */

  if (loading) {
    return (
      <div className="rounded-xl bg-white ring-1 ring-slate-200/60 p-6 space-y-4">
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
      <div className="rounded-xl bg-white ring-1 ring-slate-200/60 p-6 text-center space-y-3">
        <div className="text-red-600 font-semibold">
          Failed to load notification settings
        </div>
        <button
          onClick={loadSettings}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ---------- UI ---------- */

  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200/60">

      {/* Header */}
      <header className="p-6 border-b border-slate-100">
        <h3 className="text-lg font-semibold">
          Workspace Email Notifications
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Control who receives email alerts for this workspace.
        </p>
      </header>

      {/* Self Setting */}
      {self && (
        <section className="p-6 border-b border-slate-100 space-y-4">
          <div>
            <div className="font-medium text-slate-800">
              Your Preference
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Disable this if you do not want email alerts.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-slate-600 max-w-xl">
              {cooldown
                ? "Please wait before changing again."
                : self.email_notifications_enabled
                ? "You will receive workspace alert emails."
                : "Alerts are disabled for you."}
            </p>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={self.email_notifications_enabled}
                disabled={saving || cooldown}
                onChange={() =>
                  toggleSelf(!self.email_notifications_enabled)
                }
                className="
                  h-5 w-5
                  accent-green-600
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              />
              <span className="text-sm text-slate-700">
                Enable emails
              </span>
            </label>
          </div>
        </section>
      )}

      {/* Team Status */}
      <section className="divide-y divide-slate-100">
        <div className="px-6 pt-4 pb-2 text-sm font-semibold text-slate-600">
          Team Notification Status
        </div>

        {members.map(m => (
          <div
            key={m.user_id}
            className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div>
              <div className="font-medium text-slate-800">
                {m.name}
                {m.user_id === currentUserId && (
                  <span className="text-blue-600"> (You)</span>
                )}
              </div>
              <div className="text-sm text-slate-500 break-all">
                {m.email}
              </div>
            </div>

            <div className="text-sm text-slate-600">
              {m.email_notifications_enabled
                ? "Receiving alerts"
                : "Alerts paused"}
            </div>
          </div>
        ))}
      </section>

      {/* Warning */}
      {allDisabled && (
        <section className="p-6 border-t border-slate-100">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            All members have disabled notifications. Important alerts may go unnoticed.
          </div>
        </section>
      )}
    </div>
  );
}
