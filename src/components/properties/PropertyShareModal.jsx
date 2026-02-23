import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Share2, X, Copy, Check, Mail, MessageCircle, QrCode,
  Facebook, Send, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function PropertyShareModal({ propertyTitle, propertyUrl }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState(null);


  // Generate QR code when modal opens
  useEffect(() => {
    if (showQR && !qrCode) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(propertyUrl)}`;
      setQrCode(qrUrl);
    }
  }, [showQR, propertyUrl, qrCode]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(propertyUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };



  const socialOptions = [
    {
      name: "Facebook",
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(propertyUrl)}`,
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      name: "X",
      icon: Send,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(propertyUrl)}&text=${encodeURIComponent(`Check out: ${propertyTitle}`)}`,
      color: "bg-black hover:bg-gray-800"
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodeURIComponent(`Check out this property: ${propertyTitle}\n${propertyUrl}`)}`,
      color: "bg-green-500 hover:bg-green-600"
    }
  ];

  const handleEmailShare = () => {
    const subject = `Check out: ${propertyTitle}`;
    const body = `I found this great property: ${propertyUrl}\n\nCheck it out!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSMSShare = () => {
    const message = `Check out this property: ${propertyTitle} ${propertyUrl}`;
    window.location.href = `sms:?body=${encodeURIComponent(message)}`;
  };

  const handleSocialClick = (url) => {
    window.open(url, "share", "width=600,height=400");
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="icon" 
        className="rounded-full"
        onClick={() => setOpen(true)}
        aria-label="Share property"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-xl p-0 overflow-hidden flex flex-col max-h-[95vh]">
          <DialogHeader className="bg-gradient-to-r from-teal-50 to-teal-100 p-6 border-b">
            <DialogTitle className="text-xl">Share this property</DialogTitle>
            <p className="text-sm text-gray-600 mt-1">{propertyTitle}</p>
          </DialogHeader>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Copy Link Section */}
            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-3">
                Copy Link
              </label>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all group"
                aria-label="Copy property link"
              >
                <span className="text-sm text-gray-600 truncate group-hover:text-gray-900">
                  {propertyUrl.replace('https://', '')}
                </span>
                <motion.div
                  initial={false}
                  animate={{ scale: copied ? 1.2 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 ml-2" />
                  )}
                </motion.div>
              </button>
            </div>

            {/* Social Sharing */}
            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-3">
                Share
              </label>
              <div className="grid grid-cols-3 gap-2">
                {socialOptions.map((social) => {
                  const Icon = social.icon;
                  return (
                    <button
                      key={social.name}
                      onClick={() => handleSocialClick(social.url)}
                      className={`${social.color} text-white rounded-lg py-2 px-2 flex flex-col items-center justify-center gap-1 transition-all hover:shadow-lg`}
                      aria-label={`Share on ${social.name}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{social.name}</span>
                    </button>
                  );
                })}
                <button
                  onClick={handleEmailShare}
                  className="flex flex-col items-center justify-center gap-1 py-2 px-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg border border-orange-200 transition-all"
                  aria-label="Share via email"
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-medium">Email</span>
                </button>
                <button
                  onClick={handleSMSShare}
                  className="flex flex-col items-center justify-center gap-1 py-2 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-all"
                  aria-label="Share via SMS"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">SMS</span>
                </button>
              </div>
            </div>

            {/* QR Code Toggle */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowQR(!showQR)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all"
                aria-label="Toggle QR code"
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Generate QR Code</span>
                </div>
                <span className="text-xs text-gray-500">{showQR ? 'Hide' : 'Show'}</span>
              </button>

              <AnimatePresence>
                {showQR && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 flex flex-col items-center"
                  >
                    {qrCode && (
                      <img 
                        src={qrCode} 
                        alt="QR Code" 
                        className="w-48 h-48 rounded-lg border-2 border-teal-200"
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Scan with your camera to share this property
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>


          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}