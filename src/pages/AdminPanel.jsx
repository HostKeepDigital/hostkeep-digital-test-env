import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield } from "lucide-react";

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u?.id) {
        const roles = await base44.entities.UserRole.filter({ user_id: u.id });
        setAuthorized(roles.some(r => r.role === 'admin'));
      } else {
        setAuthorized(false);
      }
    }).catch(() => setAuthorized(false));
  }, []);

  if (authorized === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <p className="text-gray-500">Admin functionality will be added here. Routing is confirmed working.</p>
      </div>
    </div>
  );
}