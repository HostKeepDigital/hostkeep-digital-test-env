import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SEVERITY_CONFIG = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    icon: AlertCircle,
    iconColor: "text-red-500",
    dot: "bg-red-500",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    dot: "bg-amber-400",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    icon: Info,
    iconColor: "text-blue-500",
    dot: "bg-blue-400",
  },
};

const TYPE_LABELS = {
  failed_payment:              "Failed Payment",
  payment_overdue:             "Payment Overdue",
  high_risk_user:              "High-Risk User",
  new_complaint:               "New Complaint",
  new_high_risk_registration:  "High-Risk Registration",
  document_failed:             "Document Failed",
};

export default function AlertsTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("unread");

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-alerts", filter],
    queryFn: () => {
      if (filter === "all") return base44.entities.AdminAlert.list("-created_date", 200);
      return base44.entities.AdminAlert.filter({ status: filter }, "-created_date", 200);
    },
    refetchInterval: 30000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["admin-alerts-count"],
    queryFn: async () => {
      const items = await base44.entities.AdminAlert.filter({ status: "unread" }, "-created_date", 200);
      return items.length;
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.AdminAlert.update(id, { status: "read", resolved_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-alerts"]);
      queryClient.invalidateQueries(["admin-alerts-count"]);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => base44.entities.AdminAlert.update(id, { status: "dismissed", resolved_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-alerts"]);
      queryClient.invalidateQueries(["admin-alerts-count"]);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = await base44.entities.AdminAlert.filter({ status: "unread" });
      await Promise.all(unread.map(a =>
        base44.entities.AdminAlert.update(a.id, { status: "read", resolved_at: new Date().toISOString() })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-alerts"]);
      queryClient.invalidateQueries(["admin-alerts-count"]);
    },
  });

  const critical = alerts.filter(a => a.severity === "critical");
  const others   = alerts.filter(a => a.severity !== "critical");

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Admin Alerts</h2>
          <p className="text-xs text-gray-400 mt-0.5">Critical events requiring timely action</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
              <CheckCircle className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: "unread",    label: "Unread",    count: unreadCount },
          { id: "read",      label: "Read",      count: null },
          { id: "dismissed", label: "Dismissed", count: null },
          { id: "all",       label: "All",       count: null },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              filter === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
            {count != null && count > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && alerts.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {filter === "unread" ? "No unread alerts — all clear!" : "No alerts in this category."}
          </p>
          <p className="text-xs text-gray-400 mt-1">Alerts are generated automatically when critical events occur.</p>
        </div>
      )}

      {/* Critical alerts first */}
      {!isLoading && critical.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Critical ({critical.length})
          </p>
          {critical.map(alert => <AlertRow key={alert.id} alert={alert} onRead={markReadMutation.mutate} onDismiss={dismissMutation.mutate} />)}
        </div>
      )}

      {/* Other alerts */}
      {!isLoading && others.length > 0 && (
        <div className="space-y-3">
          {critical.length > 0 && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Warnings & Info ({others.length})
            </p>
          )}
          {others.map(alert => <AlertRow key={alert.id} alert={alert} onRead={markReadMutation.mutate} onDismiss={dismissMutation.mutate} />)}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, onRead, onDismiss }) {
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className={`flex gap-4 p-4 rounded-xl border ${cfg.bg} ${cfg.border} ${alert.status === "unread" ? "ring-1 ring-inset ring-current ring-opacity-10" : "opacity-80"}`}>
      <div className={`flex-shrink-0 mt-0.5`}>
        <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {TYPE_LABELS[alert.alert_type] || alert.alert_type}
            </span>
            {alert.status === "unread" && (
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Unread" />
            )}
            <span className="text-xs text-gray-400">
              {alert.created_date ? formatDistanceToNow(new Date(alert.created_date), { addSuffix: true }) : ""}
            </span>
          </div>
          {alert.status !== "dismissed" && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {alert.status === "unread" && (
                <button
                  onClick={() => onRead(alert.id)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Mark read
                </button>
              )}
              <button
                onClick={() => onDismiss(alert.id)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm font-medium text-gray-800">{alert.title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
        {alert.metadata && Object.keys(alert.metadata).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(alert.metadata).map(([k, v]) => v != null && (
              <span key={k} className="text-xs bg-white/70 border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">
                <span className="font-medium">{k.replace(/_/g, " ")}:</span> {String(v)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}