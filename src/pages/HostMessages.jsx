import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, User, Search, Loader2, Plus, ArrowLeft, Paperclip, MoreVertical, Flag, ShieldBan, Check, CheckCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import NewMessageModal from "@/components/messaging/NewMessageModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function HostMessages() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        if (event.data.sender_id === user.id || event.data.receiver_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ['host-messages'] });
        }
      }
    });
    return unsubscribe;
  }, [user?.id, queryClient]);

  const { data: messages = [] } = useQuery({
    queryKey: ['host-messages', user?.id],
    queryFn: async () => {
      const sent = await base44.entities.Message.filter({ sender_id: user?.id });
      const received = await base44.entities.Message.filter({ receiver_id: user?.id });
      return [...sent, ...received].sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
    },
    enabled: !!user?.id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['host-bookings', user?.id],
    queryFn: () => base44.entities.Booking.filter({ host_id: user?.id }),
    enabled: !!user?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-messages'] });
      setNewMessage("");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (messageId) => base44.entities.Message.update(messageId, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['host-messages'] }),
  });

  // Group messages by conversation
  const conversations = messages.reduce((acc, msg) => {
    if (!acc[msg.conversation_id]) {
      acc[msg.conversation_id] = {
        id: msg.conversation_id,
        messages: [],
        otherPartyId: msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id,
        otherPartyName: msg.sender_id === user?.id ? 'Guest' : msg.sender_name,
        propertyId: msg.property_id,
        bookingId: msg.booking_id,
        unreadCount: 0,
        lastMessage: null,
      };
    }
    acc[msg.conversation_id].messages.push(msg);
    if (!msg.read && msg.receiver_id === user?.id) {
      acc[msg.conversation_id].unreadCount++;
    }
    if (!acc[msg.conversation_id].lastMessage || 
        new Date(msg.created_date) > new Date(acc[msg.conversation_id].lastMessage.created_date)) {
      acc[msg.conversation_id].lastMessage = msg;
    }
    return acc;
  }, {});

  const conversationList = Object.values(conversations)
    .sort((a, b) => new Date(b.lastMessage?.created_date) - new Date(a.lastMessage?.created_date))
    .filter(conv => 
      conv.otherPartyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const selectedConv = selectedConversation ? conversations[selectedConversation] : null;

  useEffect(() => {
    if (selectedConv) {
      selectedConv.messages
        .filter(m => !m.read && m.receiver_id === user?.id)
        .forEach(m => markReadMutation.mutate(m.id));
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation, selectedConv?.messages?.length]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConv) return;

    sendMessageMutation.mutate({
      conversation_id: selectedConversation,
      sender_id: user.id,
      sender_name: user.full_name,
      receiver_id: selectedConv.otherPartyId,
      property_id: selectedConv.propertyId,
      booking_id: selectedConv.bookingId,
      content: newMessage.trim(),
      message_type: "text",
    });
  };

  const getBookingInfo = (bookingId) => {
    return bookings.find(b => b.id === bookingId);
  };

  const quickReplies = [
    "Here is your check-in info.",
    "Just a reminder about house rules.",
    "Your payment is due soon."
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border-b border-gray-100 p-4">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        </div>

        <div className="flex h-[calc(100vh-120px)] relative overflow-hidden">
          {/* Conversation List */}
          <AnimatePresence initial={false}>
            {(!selectedConversation || window.innerWidth >= 768) && (
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className={`w-full md:w-80 border-r border-gray-100 bg-white flex flex-col absolute md:relative z-10 h-full ${selectedConversation ? 'hidden md:flex' : 'flex'}`}
              >
            <div className="p-4 border-b border-gray-100 space-y-4">
              <Button 
                onClick={() => setShowMessageModal(true)} 
                className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                New message
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {conversationList.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No messages yet</p>
                </div>
              ) : (
                conversationList.map(conv => {
                  const booking = getBookingInfo(conv.bookingId);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                        selectedConversation === conv.id ? 'bg-teal-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 truncate">
                              {conv.otherPartyName || 'Guest'}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge className="bg-teal-500">{conv.unreadCount}</Badge>
                            )}
                          </div>
                          {booking && (
                            <p className="text-xs text-teal-600 truncate">
                              {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d")}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {conv.lastMessage?.content}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message Thread */}
          <AnimatePresence initial={false}>
            {selectedConv ? (
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="flex-1 flex flex-col bg-gray-50 absolute md:relative z-20 h-full w-full"
              >
                {/* Header */}
                <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden mr-1"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedConv.otherPartyName || 'Guest'}</p>
                      {getBookingInfo(selectedConv.bookingId) && (
                        <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">
                          Booking: {format(parseISO(getBookingInfo(selectedConv.bookingId).check_in), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-48">
                      <div className="space-y-1">
                        <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => toast.success("User reported")}>
                          <Flag className="w-4 h-4 mr-2" /> Report User
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => toast.success("User blocked")}>
                          <ShieldBan className="w-4 h-4 mr-2" /> Block User
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {selectedConv.messages.map(msg => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                          msg.sender_id === user?.id 
                            ? 'bg-teal-600 text-white rounded-tr-sm' 
                            : 'bg-white text-gray-900 border border-gray-100 rounded-tl-sm'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 ${
                            msg.sender_id === user?.id ? 'text-teal-100' : 'text-gray-400'
                          }`}>
                            <span className="text-[10px]">
                              {format(parseISO(msg.created_date), "h:mm a")}
                            </span>
                            {msg.sender_id === user?.id && (
                              msg.read ? <CheckCheck className="w-3 h-3 text-teal-200" /> : <Check className="w-3 h-3 text-teal-200/50" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="bg-white border-t border-gray-100 p-3 flex flex-col gap-2">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {quickReplies.map((reply, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="cursor-pointer whitespace-nowrap bg-gray-100 hover:bg-gray-200 text-gray-700 font-normal"
                        onClick={() => setNewMessage(reply)}
                      >
                        {reply}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-end gap-2">
                    <Button variant="ghost" size="icon" className="shrink-0 text-gray-400 hover:text-gray-600" onClick={() => toast.info("Attachment support coming soon")}>
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 border-gray-200 rounded-xl bg-gray-50 focus-visible:ring-teal-500"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      className="bg-teal-600 hover:bg-teal-700 rounded-xl shrink-0"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center hidden md:flex">
                <div>
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                  <p className="text-gray-500">Choose a message thread to view</p>
                </div>
              </div>
            )}
          </AnimatePresence>
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