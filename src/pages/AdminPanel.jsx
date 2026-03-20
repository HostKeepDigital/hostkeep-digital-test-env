import { Shield } from "lucide-react";

export default function AdminPanel() {
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