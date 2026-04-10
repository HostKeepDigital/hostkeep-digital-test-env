import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      const records = await base44.entities.Notification.filter(
        { user_id: user.id },
        "-created_date",
        20
      );
      setNotifications(records || []);
    };

    load();

    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_id !== user.id) return;
      setNotifications((prev) => {
        if (event.type === "create") return [event.data, ...prev].slice(0, 20);
        if (event.type === "update") return prev.map((n) => n.id === event.id ? event.data : n);
        if (event.type === "delete") return prev.filter((n) => n.id !== event.id);
        return prev;
      });
    });

    return unsub;
  }, [user?.id]);

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
    const unreadOnes = notifications.filter((n) => !n.read);
    for (const n of unreadOnes) {
      await base44.entities.Notification.update(n.id, { read: true });
    }
  };

  const handleOpen = () => {
    setOpen((o) => !o);
  };

  const handleClick = async (n) => {
    if (!n.read) {
      await base44.entities.Notification.update(n.id, { read: true });
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
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                n.link ? (
                  <Link
                    key={n.id}
                    to={n.link}
                    onClick={() => handleClick(n)}
                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${!n.read ? "bg-teal-50/50" : ""}`}
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />}
                  </Link>
                ) : (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 cursor-pointer ${!n.read ? "bg-teal-50/50" : ""}`}
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />}
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