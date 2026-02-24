import { useState } from "react";
import { format, parseISO } from "date-fns";
import { User, Search, MapPin, Briefcase, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function ConversationList({ 
  conversations, 
  selectedId, 
  onSelect, 
  currentUserId,
  role = "host" // host, guest, cleaner
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter(conv => {
    const otherPartyName = conv.otherPartyName || "User";
    const content = conv.lastMessage?.content || "";
    const searchLower = searchQuery.toLowerCase();
    return otherPartyName.toLowerCase().includes(searchLower) || content.toLowerCase().includes(searchLower);
  });

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-100 w-full md:w-80">
      <div className="p-4 border-b border-gray-100 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-teal-500 rounded-xl"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4 text-gray-500">
            No conversations found
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredConversations.map(conv => {
              const isActive = selectedId === conv.id;
              const unreadCount = conv.unreadCount || 0;
              const isOnline = false; // Placeholder for real-time status

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={cn(
                    "w-full p-4 text-left transition-all hover:bg-gray-50 flex gap-3 relative",
                    isActive && "bg-teal-50 hover:bg-teal-50"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={conv.otherPartyImage} />
                      <AvatarFallback className={cn("bg-teal-100 text-teal-700", isActive && "bg-teal-200")}>
                        {conv.otherPartyName?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className={cn("font-semibold truncate pr-2", isActive ? "text-teal-900" : "text-gray-900")}>
                        {conv.otherPartyName || "User"}
                      </h3>
                      {conv.lastMessage?.created_date && (
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {format(parseISO(conv.lastMessage.created_date), "MMM d")}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      {role === "cleaner" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-gray-200 bg-gray-50 text-gray-600 font-normal">
                          Job #{conv.jobId?.slice(-4)}
                        </Badge>
                      )}
                      {role !== "cleaner" && conv.bookingId && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-gray-200 bg-gray-50 text-gray-600 font-normal">
                          Booking
                        </Badge>
                      )}
                      {conv.propertyName && (
                        <span className="truncate max-w-[120px]">{conv.propertyName}</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <p className={cn("text-sm truncate flex-1", unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500")}>
                        {conv.lastMessage?.sender_id === currentUserId && "You: "}
                        {conv.lastMessage?.content || "No messages yet"}
                      </p>
                      {unreadCount > 0 && (
                        <Badge className="bg-teal-500 hover:bg-teal-600 h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}