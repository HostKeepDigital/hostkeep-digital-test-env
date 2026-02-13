import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Star, MapPin, Users, Bed, Bath, Calendar, CheckCircle, X,
  Wifi, Car, Wind, Waves, ChefHat, Tv, Flame, TreeDeciduous,
  Heart, Share2, ChevronLeft, ChevronRight, MessageSquare, Loader2
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { toast } from "sonner";

const AMENITY_ICONS = {
  "WiFi": Wifi, "Parking": Car, "Air Conditioning": Wind, "Pool": Waves,
  "Kitchen": ChefHat, "TV": Tv, "Hot Tub": Flame, "Garden": TreeDeciduous,
};

export default function PropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const results = await base44.entities.Property.filter({ id: propertyId });
      return results[0];
    },
    enabled: !!propertyId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['property-reviews', propertyId],
    queryFn: () => base44.entities.Review.filter({ property_id: propertyId, visible: true }),
    enabled: !!propertyId,
  });

  const { data: host } = useQuery({
    queryKey: ['host', property?.owner_id],
    queryFn: async () => {
      if (!property?.owner_id) return null;
      const users = await base44.entities.User.filter({ id: property.owner_id });
      return users[0];
    },
    enabled: !!property?.owner_id,
  });

  const bookingMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Booking.create(data);
    },
    onSuccess: () => {
      toast.success("Booking request sent! The host will respond shortly.");
      setShowBookingDialog(false);
    },
  });

  const photos = property?.photos?.length > 0 
    ? property.photos 
    : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"];

  const nights = checkIn && checkOut ? differenceInDays(parseISO(checkOut), parseISO(checkIn)) : 0;
  const subtotal = nights * (property?.nightly_rate || 0);
  const cleaningFee = property?.cleaning_fee || 0;
  const total = subtotal + cleaningFee;

  const handleBooking = () => {
    if (!checkIn || !checkOut || !guestName || !guestEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    bookingMutation.mutate({
      property_id: propertyId,
      host_id: property.owner_id,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      check_in: checkIn,
      check_out: checkOut,
      guests_count: guestCount,
      nightly_rate: property.nightly_rate,
      nights: nights,
      subtotal: subtotal,
      cleaning_fee: cleaningFee,
      total_amount: total,
      booking_status: "pending",
      booking_type: "request",
      guest_message: guestMessage,
      payment_link_id: crypto.randomUUID().slice(0, 8),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Property not found</h2>
          <p className="text-gray-500">This property may have been removed or is no longer available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0">
      {/* Image Gallery */}
      <div className="relative">
        <div className="aspect-[16/9] md:aspect-[21/9] relative overflow-hidden bg-gray-100">
          <img 
            src={photos[currentImageIndex]} 
            alt={property.title}
            className="w-full h-full object-cover"
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentImageIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                  <p className="text-gray-500 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {property.location?.city}, {property.location?.country || 'UK'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> {property.guest_capacity} guests
                </span>
                <span className="flex items-center gap-1">
                  <Bed className="w-4 h-4" /> {property.bedrooms} bedrooms
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="w-4 h-4" /> {property.bathrooms} bathrooms
                </span>
                {property.average_rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {property.average_rating.toFixed(1)} ({property.review_count} reviews)
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About this property</h2>
              <p className="text-gray-600 whitespace-pre-line">{property.description || "No description provided."}</p>
            </div>

            {/* Amenities */}
            {property.amenities?.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.amenities.map(amenity => {
                      const Icon = AMENITY_ICONS[amenity] || CheckCircle;
                      return (
                        <div key={amenity} className="flex items-center gap-3 text-gray-600">
                          <Icon className="w-5 h-5 text-teal-600" />
                          <span>{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* House Rules */}
            <Separator />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">House Rules</h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>Check-in: {property.check_in_time || "3:00 PM"}</div>
                <div>Check-out: {property.check_out_time || "10:00 AM"}</div>
                <div>Minimum stay: {property.minimum_stay || 1} night(s)</div>
                <div className="flex items-center gap-2">
                  {property.pets_allowed ? (
                    <><CheckCircle className="w-4 h-4 text-green-500" /> Pets allowed</>
                  ) : (
                    <><X className="w-4 h-4 text-red-500" /> No pets</>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {property.smoking_allowed ? (
                    <><CheckCircle className="w-4 h-4 text-green-500" /> Smoking allowed</>
                  ) : (
                    <><X className="w-4 h-4 text-red-500" /> No smoking</>
                  )}
                </div>
              </div>
              {property.house_rules && (
                <p className="mt-4 text-gray-600">{property.house_rules}</p>
              )}
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Reviews ({reviews.length})
                  </h2>
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map(review => (
                      <Card key={review.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{review.reviewer_name}</p>
                              <p className="text-sm text-gray-500">
                                {format(parseISO(review.created_date), "MMMM yyyy")}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              <span className="font-medium">{review.rating}</span>
                            </div>
                          </div>
                          <p className="text-gray-600">{review.comment}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Booking Card - Desktop */}
          <div className="hidden md:block">
            <Card className="sticky top-24">
              <CardHeader>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">£{property.nightly_rate}</span>
                  <span className="text-gray-500">/ night</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Check-in</Label>
                    <Input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Check-out</Label>
                    <Input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || format(addDays(new Date(), 1), "yyyy-MM-dd")}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Guests</Label>
                  <Input
                    type="number"
                    min="1"
                    max={property.guest_capacity}
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                  />
                </div>

                {nights > 0 && (
                  <div className="space-y-2 py-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span>£{property.nightly_rate} x {nights} nights</span>
                      <span>£{subtotal}</span>
                    </div>
                    {cleaningFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Cleaning fee</span>
                        <span>£{cleaningFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span>£{total}</span>
                    </div>
                  </div>
                )}

                <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700" disabled={!checkIn || !checkOut}>
                      Request to Book
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Complete your booking request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Full Name *</Label>
                        <Input
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="+44 7123 456789"
                        />
                      </div>
                      <div>
                        <Label>Message to host</Label>
                        <Textarea
                          value={guestMessage}
                          onChange={(e) => setGuestMessage(e.target.value)}
                          placeholder="Introduce yourself and share why you're visiting..."
                          rows={3}
                        />
                      </div>
                      <Button 
                        className="w-full bg-teal-600 hover:bg-teal-700"
                        onClick={handleBooking}
                        disabled={bookingMutation.isPending}
                      >
                        {bookingMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                        ) : (
                          "Send Booking Request"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <p className="text-center text-sm text-gray-500">You won't be charged yet</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Booking Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between">
        <div>
          <span className="text-xl font-bold">£{property.nightly_rate}</span>
          <span className="text-gray-500"> / night</span>
        </div>
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              Request to Book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Book this property</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Check-in</Label>
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Check-out</Label>
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Guests</Label>
                <Input
                  type="number"
                  min="1"
                  max={property.guest_capacity}
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                />
              </div>
              <Separator />
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>
              <div>
                <Label>Message to host</Label>
                <Textarea
                  value={guestMessage}
                  onChange={(e) => setGuestMessage(e.target.value)}
                  rows={3}
                />
              </div>
              {nights > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>£{property.nightly_rate} x {nights} nights</span>
                    <span>£{subtotal}</span>
                  </div>
                  {cleaningFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Cleaning fee</span>
                      <span>£{cleaningFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>£{total}</span>
                  </div>
                </div>
              )}
              <Button 
                className="w-full bg-teal-600 hover:bg-teal-700"
                onClick={handleBooking}
                disabled={bookingMutation.isPending || !checkIn || !checkOut}
              >
                {bookingMutation.isPending ? "Sending..." : "Send Booking Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}