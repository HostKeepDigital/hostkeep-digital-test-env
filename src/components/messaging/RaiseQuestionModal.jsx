import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function RaiseQuestionModal({ isOpen, onClose, booking, guestUser }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const conversationId = `booking_${booking.id}`;
      
      await base44.entities.Message.create({
        conversation_id: conversationId,
        booking_id: booking.id,
        property_id: booking.property_id,
        sender_id: guestUser.id,
        sender_name: guestUser.full_name,
        receiver_id: booking.host_id,
        content: `[${subject}]\n\n${message}`,
        message_type: "text",
        read: false,
      });
    },
    onSuccess: () => {
      toast.success("Message sent to host!");
      setSubject("");
      setMessage("");
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!subject || !message.trim()) return;
    sendMessageMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message Host</DialogTitle>
          <DialogDescription>
            Have a question about your booking? Send a message to the host.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Topic</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Check-in / Check-out">Check-in / Check-out</SelectItem>
                <SelectItem value="Amenities">Amenities</SelectItem>
                <SelectItem value="House Rules">House Rules</SelectItem>
                <SelectItem value="Report an Issue">Report an Issue</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea 
              placeholder="Type your message here..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            className="bg-teal-600 hover:bg-teal-700" 
            onClick={handleSubmit}
            disabled={!subject || !message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}