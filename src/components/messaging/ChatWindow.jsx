import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { notifyMessage } from "@/lib/notificationHelpers";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Send, MoreHorizontal, ArrowLeft, Loader2, ChevronDown, User
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatWindow({
  conversation,
  currentUserId,
  onBack,
  role = "host"
}) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages?.length]);

  const markReadMutation = useMutation({
    mutationFn: (messageIds) =>
      Promise.all(messageIds.map(id => base44.entities.Message.update(id, { read: true }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] })
  });

  useEffect(() => {
    if (conversation?.messages) {
      const unreadIds = conversation.messages
        .filter(m => !m.read && m.receiver_id === currentUserId)
        .map(m => m.id);
      if (unreadIds.length > 0) markReadMutation.mutate(unreadIds);
    }
  }, [conversation?.id, conversation?.messages?.length]);

  const sendMessageMutation = useMutation({
    mutationFn: (content) => base44.entities.Message.create({
      conversation_id: conversation.id,
      booking_id: conversation.bookingId,
      job_id: conversation.jobId,
      property_id: conversation.propertyId,
      sender_id: currentUserId,
      sender_name: "Me",
      receiver_id: conversation.otherPartyId,
      content,
      message_type: "text",
      read: false,
      created_date: new Date().toISOString()
    }),
    onMutate: async (content) => {
      setNewMessage("");
      await queryClient.cancelQueries({ queryKey: ['messages'] });
      const previous = queryClient.getQueryData(['messages']);
      const optimisticMsg = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversation.id,
        sender_id: currentUserId,
        receiver_id: conversation.otherPartyId,
        content,
        message_type: "text",
        read: false,
        created_date: new Date().toISOString(),
      };
      queryClient.setQueryData(['messages'], (old) => {
        if (!old) return old;
        if (Array.isArray(old)) return [...old, optimisticMsg];
        return old;
      });
      return { previous };
    },
    onError: (_err, content, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(['messages'], context.previous);
      setNewMessage(content);
      toast.error("Failed to send message");
    },
    onSuccess: (_, content) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      notifyMessage(conversation.otherPartyId, "Your host", content);
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation) return null;

  return (
    <div className="flex flex-col h-full" style={{ background: "#ebebf5" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden -ml-1 text-gray-500"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {/* Crosshair / chat icon */}
          <div className="w-7 h-7 flex items-center justify-center text-violet-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-800 text-sm">
            Your chat with {conversation.otherPartyName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 h-8 w-8">
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-5" style={{ overscrollBehavior: "contain" }}>
        <div className="space-y-1 max-w-lg mx-auto">
          {conversation.messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            const isSystem = msg.message_type === "system";
            const prevMsg = conversation.messages[idx - 1];
            const nextMsg = conversation.messages[idx + 1];
            const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
            const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || nextMsg.message_type === "system";

            // System / divider messages
            if (isSystem) {
              return (
                <div key={msg.id} className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px" style={{ background: "#7c3aed" }} />
                  <span className="text-sm font-medium whitespace-nowrap" style={{ color: "#7c3aed" }}>
                    {msg.content}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "#7c3aed" }} />
                </div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}
                style={{ marginBottom: isLastInGroup ? 12 : 3 }}
              >
                {/* Avatar for other party */}
                {!isMe && (
                  <div className="flex-shrink-0 flex flex-col justify-end" style={{ width: 36 }}>
                    {isFirstInGroup && (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "#5b21b6" }}
                      >
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                )}

                <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")} style={{ maxWidth: "78%" }}>
                  {/* Bubble */}
                  <div
                    className={cn(
                      "px-4 py-3 text-sm leading-relaxed",
                      isMe
                        ? "text-gray-900"
                        : "text-gray-900"
                    )}
                    style={{
                      background: "white",
                      borderRadius: 16,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                      ...(isMe
                        ? { borderBottomRightRadius: isLastInGroup ? 4 : 16 }
                        : { borderBottomLeftRadius: isLastInGroup ? 4 : 16 })
                    }}
                  >
                    {msg.message_type === "image" ? (
                      <img src={msg.attachment_url} alt="Attachment" className="rounded-lg max-w-full" />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Timestamp below last bubble in group */}
                  {isLastInGroup && (
                    <span className="text-[11px] text-gray-400 mt-1 px-1">
                      {format(parseISO(msg.created_date), "h:mm aa")}
                    </span>
                  )}
                </div>

                {/* Spacer for my messages (no avatar) */}
                {isMe && <div className="w-9 flex-shrink-0" />}
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <div
            className="flex-1 flex items-center px-4 py-2.5 rounded-full border border-gray-200 bg-white focus-within:border-violet-400 transition-colors"
          >
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter text"
              className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-700 placeholder-gray-400"
              style={{ WebkitAppearance: "none" }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
            style={{ background: "#9ca3af" }}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}