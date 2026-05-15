import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";

const PREF_MAP = {
  booking_request: "bookings", booking_confirmed: "bookings", booking_declined: "bookings",
  booking_cancelled: "bookings", booking_checked_in: "bookings", booking_completed: "bookings",
  new_message: "messages", cleaning_job_assigned: "jobs", cleaning_job_accepted: "jobs",
  cleaning_job_declined: "jobs", cleaning_job_completed: "jobs",
  payment_received: "payments", payment_due: "payments", general: "general",
};

const relativeTime = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const typeConfig = (type) => {
  if (type === "booking_request")   return { icon: "🏠", bg: "bg-blue-50",   dot: "bg-blue-500"   };
  if (type === "booking_confirmed") return { icon: "✅", bg: "bg-teal-50",   dot: "bg-teal-500"   };
  if (type === "booking_declined" || type === "booking_cancelled") return { icon: "❌", bg: "bg-red-50", dot: "bg-red-500" };
  if (type === "booking_completed") return { icon: "🎉", bg: "bg-green-50",  dot: "bg-green-500"  };
  if (type === "booking_checked_in") return { icon: "🏡", bg: "bg-teal-50", dot: "bg-teal-500"   };
  if (type === "new_message")       return { icon: "💬", bg: "bg-purple-50", dot: "bg-purple-500" };
  if (type === "payment_due" || type === "payment_received") return { icon: "💳", bg: "bg-green-50", dot: "bg-green-500" };
  if (type?.includes("job"))        return { icon: "🧹", bg: "bg-orange-50", dot: "bg-orange-500" };
  return { icon: "🔔", bg: "bg-gray-50", dot: "bg-gray-400" };
};

const triggerBrowserNotification = (notif, prefs) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const prefKey = PREF_MAP[notif.type] || "general";
  if (prefs[prefKey] === false) return;
  try {
    new Notification(notif.title, { body: notif.body, icon: "/favicon.ico", tag: notif.id });
  } catch (_) {}
};

const callFn = async (name, body = {}) => {
  const res = await fetch(`/functions/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
};

export default function NotificationBell() {
  const { user, sessionToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      if (!sessionToken) return;
      try {
        const data = await callFn("getNotifications", { session_token: sessionToken });
        setNotifications(data.notifications || []);
      } catch (_) {}
    };

    load();

     const interval = setInterval(async () => {
      if (!sessionToken) return;
      try {
        const data = await callFn("getNotifications", { session_token: sessionToken });
        setNotifications(data.notifications || []);
      } catch (_) {}
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id, sessionToken]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!sessionToken) return;
    try {
      await callFn("markNotificationsRead", { session_token: sessionToken, all: true });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (_) {}
  };

  const handleOpen = () => {
    setOpen((o) => !o);
  };

  const handleClick = async (n) => {
    if (!n.read && sessionToken) {
      try {
        await callFn("markNotificationsRead", { session_token: sessionToken, notification_id: n.id });
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      } catch (_) {}
    }
    setOpen(false);
  };

  const typeIcon = (type) => {
    if (type?.includes("booking")) return "📅";
    if (type?.includes("message")) return "💬";
    if (type?.includes("cleaning") || type?.includes("job")) return "🧹";
    if (type?.includes("payment")) return "💳";
    return "🔔";
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-3 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-[3px] right-[3px] top-16 sm:left-auto sm:right-0 sm:w-80 sm:absolute sm:top-full sm:mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Notifications</h3>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                n.link ? (
                  <Link
                    key={n.id}
                    to={n.link}
                    onClick={() => handleClick(n)}
                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 ${!n.read ? typeConfig(n.type).bg : ""}`}
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{typeConfig(n.type).icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? "font-semibold text-gray-900 dark:text-gray-100" : "font-medium text-gray-700 dark:text-gray-300"}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{relativeTime(n.created_date)}</p>
                    </div>
                    {!n.read && <span className={`w-2 h-2 rounded-full ${typeConfig(n.type).dot} flex-shrink-0 mt-1.5`} />}
                  </Link>
                ) : (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 cursor-pointer ${!n.read ? typeConfig(n.type).bg : ""}`}
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{typeConfig(n.type).icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? "font-semibold text-gray-900 dark:text-gray-100" : "font-medium text-gray-700 dark:text-gray-300"}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{relativeTime(n.created_date)}</p>
                    </div>
                    {!n.read && <span className={`w-2 h-2 rounded-full ${typeConfig(n.type).dot} flex-shrink-0 mt-1.5`} />}
                  </div>
                )
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}