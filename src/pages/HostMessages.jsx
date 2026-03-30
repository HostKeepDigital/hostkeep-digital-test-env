import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ChatLayout from "@/components/messaging/ChatLayout";
import NewMessageModal from "@/components/messaging/NewMessageModal";
import { useAuth } from "@/lib/AuthContext";

export default function HostMessages() {
  const { user, isAuthenticated } = useAuth(); // ← custom auth
  const [showMessageModal, setShowMessageModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Host Messages</h1>

          <Button
            onClick={() => setShowMessageModal(true)}
            className="bg-teal-600 hover:bg-teal-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            New message
          </Button>
        </div>

        <div className="flex-1 relative overflow-hidden">
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
