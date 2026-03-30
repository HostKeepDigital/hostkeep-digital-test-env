import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { 
  Send, User, MoreVertical, Paperclip, Image as ImageIcon, Smile, 
  Check, CheckCheck, Flag, ShieldBan, ArrowLeft, Loader2, Calendar, MapPin,
  Briefcase
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatWindow({ 
  conversation, 
  currentUserId, 
  onBack,
  role = "host" // host, guest, cleaner
}) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages?.length]);

  // Mark as read when conversation opens
  const markReadMutation = useMutation({
    mutationFn: (messageIds) => {
      // In a real app, we'd batch update. Here we iterate or update conversation read status.
      // For simplicity in this demo, we assume the parent handles marking read or we do it one by one.
      // Or we update the conversation entity's unread counts.
      return Promise.all(messageIds.map(id => base44.entities.Message.update(id, { read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  useEffect(() => {
    if (conversation?.messages) {
      const unreadIds = conversation.messages
        .filter(m => !m.read && m.receiver_id === currentUserId)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        markReadMutation.mutate(unreadIds);
      }
    }
  }, [conversation?.id, conversation?.messages?.length]);

  const sendMessageMutation = useMutation({
    mutationFn: (content) => base44.entities.Message.create({
      conversation_id: conversation.id,
      booking_id: conversation.bookingId,
      job_id: conversation.jobId,
      property_id: conversation.propertyId,
      sender_id: currentUserId,
      sender_name: "Me", // Should be actual name from context
      receiver_id: conversation.otherPartyId,
      content,
      message_type: "text",
      read: false,
      created_date: new Date().toISOString()
    }),
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['messages'] });
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
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 p-3 px-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden -ml-2 mr-1 text-gray-500"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="relative">
            <Avatar className="h-10 w-10 border border-gray-100">
              <AvatarImage src={conversation.otherPartyImage} />
              <AvatarFallback className="bg-teal-100 text-teal-700 font-medium">
                {conversation.otherPartyName?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 leading-none mb-1">
              {conversation.otherPartyName}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {conversation.propertyName && (
                <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded-md">
                  <MapPin className="w-3 h-3" /> {conversation.propertyName}
                </span>
              )}
              {conversation.bookingId && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3" /> Booking
                </span>
              )}
              {conversation.jobId && (
                <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">
                  <Briefcase className="w-3 h-3" /> Job
                </span>
              )}
            </div>
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1">
            <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50 text-sm h-9" onClick={() => toast.success("User reported")}>
              <Flag className="w-4 h-4 mr-2" /> Report User
            </Button>
            <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50 text-sm h-9" onClick={() => toast.success("User blocked")}>
              <ShieldBan className="w-4 h-4 mr-2" /> Block User
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4 bg-gray-50/50" style={{ overscrollBehavior: "contain" }}>
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* System Message Example - Start of conversation */}
          <div className="flex justify-center my-4">
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              Conversation started {format(new Date(conversation.messages[0]?.created_date || new Date()), "MMM d, yyyy")}
            </span>
          </div>

          {conversation.messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            const isSystem = msg.message_type === "system";
            const showAvatar = !isMe && (idx === 0 || conversation.messages[idx - 1].sender_id !== msg.sender_id);
            
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-xs text-gray-500 italic bg-gray-100 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}
              >
                {!isMe && (
                  <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                    {showAvatar && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conversation.otherPartyImage} />
                        <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                          {conversation.otherPartyName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div className={cn(
                  "max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm relative group",
                  isMe 
                    ? "bg-teal-600 text-white rounded-tr-sm" 
                    : "bg-white text-gray-900 border border-gray-100 rounded-tl-sm"
                )}>
                  {/* Message Content */}
                  {msg.message_type === "image" ? (
                    <img src={msg.attachment_url} alt="Attachment" className="rounded-lg max-w-full mb-1" />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Metadata */}
                  <div className={cn(
                    "flex items-center justify-end gap-1 mt-1 opacity-70 text-[10px]",
                    isMe ? "text-teal-100" : "text-gray-400"
                  )}>
                    <span>{format(parseISO(msg.created_date), "h:mm a")}</span>
                    {isMe && (
                      msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-100 p-3 md:p-4">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 h-10 w-10 shrink-0">
                <Paperclip className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              <Button variant="ghost" className="w-full justify-start text-sm h-9" onClick={() => toast.info("Image upload coming soon")}>
                <ImageIcon className="w-4 h-4 mr-2" /> Image
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm h-9" onClick={() => toast.info("File upload coming soon")}>
                <Paperclip className="w-4 h-4 mr-2" /> File
              </Button>
            </PopoverContent>
          </Popover>

          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl flex items-center px-3 py-1 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="border-0 bg-transparent focus-visible:ring-0 px-0 h-10"
            />
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 h-8 w-8 shrink-0">
              <Smile className="w-5 h-5" />
            </Button>
          </div>

          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="rounded-full h-10 w-10 p-0 bg-teal-600 hover:bg-teal-700 shadow-md shrink-0 flex items-center justify-center"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white ml-0.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}