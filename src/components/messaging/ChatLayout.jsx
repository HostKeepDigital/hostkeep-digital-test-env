import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client"; // still needed for Message entity

export default function ChatLayout({ role = "host" }) {
  const { user } = useAuth(); // custom auth user
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const queryClient = useQueryClient();

  // Subscribe to message updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === "create" || event.type === "update") {
        if (
          event.data.sender_id === user.id ||
          event.data.receiver_id === user.id
        ) {
          queryClient.invalidateQueries({ queryKey: ["messages"] });
        }
      }
    });

    return unsubscribe;
  }, [user?.id, queryClient]);

  // Fetch Messages and Group into Conversations
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const sent = await base44.entities.Message.filter({
        sender_id: user.id,
      });

      const received = await base44.entities.Message.filter({
        receiver_id: user.id,
      });

      return [...sent, ...received].sort(
        (a, b) => new Date(a.created_date) - new Date(b.created_date)
      );
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // fallback polling
  });

  // Group messages into conversations
  const conversations = messages.reduce((acc, msg) => {
    const convId =
      msg.conversation_id ||
      `legacy_${[msg.sender_id, msg.receiver_id].sort().join("_")}`;

    if (!acc[convId]) {
      const isMe = msg.sender_id === user?.id;
      const otherPartyId = isMe ? msg.receiver_id : msg.sender_id;
      const otherPartyName = isMe
        ? msg.receiver_name || "User"
        : msg.sender_name || "User";

      acc[convId] = {
        id: convId,
        messages: [],
        otherPartyId,
        otherPartyName,
        otherPartyImage: null,
        bookingId: msg.booking_id,
        jobId: msg.job_id,
        propertyId: msg.property_id,
        propertyName: "Property",
        lastMessage: null,
        unreadCount: 0,
      };
    }

    acc[convId].messages.push(msg);
    acc[convId].lastMessage = msg;

    if (!msg.read && msg.receiver_id === user?.id) {
      acc[convId].unreadCount++;
    }

    return acc;
  }, {});

  const conversationList = Object.values(conversations).sort(
    (a, b) =>
      new Date(b.lastMessage?.created_date) -
      new Date(a.lastMessage?.created_date)
  );

  const selectedConversation = conversations[selectedConversationId];

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 overflow-hidden flex relative">
      {/* Sidebar / List View */}
      <AnimatePresence initial={false} mode="popLayout">
        {(!selectedConversationId || window.innerWidth >= 768) && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full md:w-80 h-full absolute md:relative z-10"
          >
            <ConversationList
              conversations={conversationList}
              selectedId={selectedConversationId}
              onSelect={(conv) => setSelectedConversationId(conv.id)}
              currentUserId={user?.id}
              role={role}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat View */}
      <AnimatePresence initial={false} mode="popLayout">
        {selectedConversationId ? (
          <motion.div
            key="chat-window"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute md:relative z-20 w-full h-full flex-1 bg-white"
          >
            <ChatWindow
              conversation={selectedConversation}
              currentUserId={user?.id}
              onBack={() => setSelectedConversationId(null)}
              role={role}
            />
          </motion.div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 text-gray-400">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-gray-300" />
              </div>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}