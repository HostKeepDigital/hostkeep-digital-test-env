import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Users, Sparkles, ArrowLeft, Calendar, Home, Clock } from "lucide-react";
import { format, parseISO, isBefore, isAfter } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";

export default function NewMessageModal({ isOpen, onClose, hostId }) {
  const [view, setView] = useState("selector"); // selector, guests, cleaners
  const [hasGuests, setHasGuests] = useState(false);
  const [hasCleaners, setHasCleaners] = useState(false);

  // Fetch bookings for guests
  const { data: bookings = [] } = useQuery({
    queryKey: ['message-bookings', hostId],
    queryFn: () => base44.entities.Booking.filter({ 
      host_id: hostId,
      booking_status: ['confirmed', 'checked_in']
    }),
    enabled: isOpen && !!hostId,
  });

  // Fetch cleaning jobs for cleaners
  const { data: cleaningJobs = [] } = useQuery({
    queryKey: ['message-cleaning-jobs', hostId],
    queryFn: () => base44.entities.CleaningJob.filter({ 
      host_id: hostId,
      status: ['pending', 'accepted', 'in_progress']
    }),
    enabled: isOpen && !!hostId,
  });

  // Fetch properties for property names
  const { data: properties = [] } = useQuery({
    queryKey: ['message-properties', hostId],
    queryFn: () => base44.entities.Property.filter({ owner_id: hostId }),
    enabled: isOpen && !!hostId,
  });

  // Fetch cleaners for cleaner names
  const { data: cleaners = [] } = useQuery({
    queryKey: ['message-cleaners'],
    queryFn: () => base44.entities.Cleaner.list(),
    enabled: isOpen && cleaningJobs.length > 0,
  });

  const today = new Date();

  // Filter active and upcoming guests
  const activeGuests = bookings
    .filter(b => {
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);
      return isBefore(checkIn, today) && isAfter(checkOut, today);
    })
    .map(b => ({ ...b, isActive: true }));

  const upcomingGuests = bookings
    .filter(b => isAfter(parseISO(b.check_in), today))
    .map(b => ({ ...b, isActive: false }));

  const allGuests = [...activeGuests, ...upcomingGuests].sort((a, b) => 
    new Date(a.check_in) - new Date(b.check_in)
  );

  // Get property name helper
  const getPropertyName = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.title || "Property";
  };

  // Get cleaner name helper
  const getCleanerName = (cleanerId) => {
    const cleaner = cleaners.find(c => c.id === cleanerId);
    return cleaner?.business_name || "Cleaner";
  };

  // Determine what to show on open
  useEffect(() => {
    if (isOpen) {
      const guestsExist = allGuests.length > 0;
      const cleanersExist = cleaningJobs.length > 0;
      
      setHasGuests(guestsExist);
      setHasCleaners(cleanersExist);

      // Auto-select if only one type exists
      if (guestsExist && !cleanersExist) {
        setView("guests");
      } else if (!guestsExist && cleanersExist) {
        setView("cleaners");
      } else {
        setView("selector");
      }
    }
  }, [isOpen, allGuests.length, cleaningJobs.length]);

  const handleClose = () => {
    setView("selector");
    onClose();
  };

  const handleBack = () => {
    if (hasGuests && hasCleaners) {
      setView("selector");
    } else {
      handleClose();
    }
  };

  const handleGuestClick = (booking) => {
    // Create or navigate to conversation with guest
    const conversationId = `booking-${booking.id}`;
    window.location.href = createPageUrl('HostMessages') + `?conversation=${conversationId}&guest=${booking.guest_id}`;
  };

  const handleCleanerClick = (job) => {
    // Create or navigate to conversation with cleaner
    const conversationId = `job-${job.id}`;
    window.location.href = createPageUrl('HostMessages') + `?conversation=${conversationId}&cleaner=${job.cleaner_user_id}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            {view !== "selector" && hasGuests && hasCleaners && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-base font-semibold text-gray-900 flex-1">
              {view === "selector" && "Who would you like to message?"}
              {view === "guests" && "Select a Guest"}
              {view === "cleaners" && "Select a Cleaner"}
            </h2>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-72px)]">
            {view === "selector" && (
              <div className="p-4 grid gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView("guests")}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30 dark:border-gray-600 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-teal-100 group-hover:bg-teal-200 flex items-center justify-center transition-colors">
                    <Users className="w-6 h-6 text-teal-600" />
                  </div>
                  <span className="text-base font-semibold text-gray-900">Guest</span>
                  {allGuests.length > 0 && (
                    <Badge variant="secondary" className="bg-gray-100">
                      {allGuests.length} available
                    </Badge>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView("cleaners")}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:border-gray-600 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-base font-semibold text-gray-900">Cleaner</span>
                  {cleaningJobs.length > 0 && (
                    <Badge variant="secondary" className="bg-gray-100">
                      {cleaningJobs.length} scheduled
                    </Badge>
                  )}
                </motion.button>
              </div>
            )}

            {view === "guests" && (
              <div className="p-4">
                {allGuests.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No active guests.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allGuests.map((booking) => (
                      <motion.button
                        key={booking.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => handleGuestClick(booking)}
                        className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900">{booking.guest_name}</p>
                              <Badge variant={booking.isActive ? "default" : "secondary"} className="text-xs">
                                {booking.isActive ? "Checked-in" : "Upcoming"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <Calendar className="w-4 h-4" />
                              {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d")}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Home className="w-4 h-4" />
                              {getPropertyName(booking.property_id)}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === "cleaners" && (
              <div className="p-4">
                {cleaningJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No scheduled cleans.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cleaningJobs
                      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                      .map((job) => (
                        <motion.button
                          key={job.id}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => handleCleanerClick(job)}
                          className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-900">{getCleanerName(job.cleaner_id)}</p>
                                <Badge variant={job.status === 'completed' ? "default" : "secondary"} className="text-xs capitalize">
                                  {job.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                <Calendar className="w-4 h-4" />
                                {format(parseISO(job.scheduled_date), "MMM d, yyyy")}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                <Clock className="w-4 h-4" />
                                {job.scheduled_time || "Morning"}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Home className="w-4 h-4" />
                                {getPropertyName(job.property_id)}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}