import ChatLayout from "@/components/messaging/ChatLayout";

export default function GuestMessages() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">My Messages</h1>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <ChatLayout role="guest" />
        </div>
      </div>
    </div>
  );
}