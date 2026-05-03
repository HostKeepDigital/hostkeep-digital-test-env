import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ChatLayout from "@/components/messaging/ChatLayout";
import NewMessageModal from "@/components/messaging/NewMessageModal";
import { useAuth } from "@/lib/AuthContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export default function HostMessages() {
  const { user, isAuthenticated } = useAuth(); // ← custom auth
  const [showMessageModal, setShowMessageModal] = useState(false);
  const { refreshing } = usePullToRefresh([["messages"], ["conversations"]]);

  return (
    <div className="fixed inset-0 pt-16 bg-gray-50 flex flex-col" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      {refreshing && (
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-center py-2 pointer-events-none">
          <div className="bg-white rounded-full shadow px-4 py-1.5 text-xs text-teal-600 font-medium flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            Refreshing…
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="bg-white border-b border-gray-100 px-3 md:px-4 py-3 flex justify-between items-center shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Host Messages</h1>

          <Button
            onClick={() => setShowMessageModal(true)}
            className="bg-teal-600 hover:bg-teal-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            New message
          </Button>
        </div>

        <div className="flex-1 relative overflow-hidden min-h-0">
          <ChatLayout role="host" />
        </div>
      </div>

      <NewMessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        hostId={user?.id}
      />
    </div>
  );
}