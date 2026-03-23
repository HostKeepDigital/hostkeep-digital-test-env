import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, Bed, Heart, Wifi, Car, Waves, ChefHat } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

const AMENITY_ICONS = {
  "WiFi": Wifi,
  "Parking": Car,
  "Pool": Waves,
  "Kitchen": ChefHat,
};

export default function PropertyCard({ property, onSave, isAvailable = true, unavailableReason, distanceMiles }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const handleSuggestionClick = (e, targetCheckIn, targetDuration) => {
    e.preventDefault();
    e.stopPropagation();
    
    const params = new URLSearchParams(window.location.search);
    if (targetCheckIn) params.set('checkIn', targetCheckIn);
    if (targetDuration) params.set('duration', targetDuration.toString());
    
    const url = createPageUrl('PropertyDetails') + `?id=${property.id}&${params.toString()}`;
    navigate(url);
  };
  
  const queryClient = useQueryClient();
  const mainPhoto = property.photos?.[0] || "https://drive.google.com/uc?export=view&id=1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a";

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: reviews = [] } = useQuery({
    queryKey: ['property-reviews', property.id],
    queryFn: () => base44.entities.Review.filter({ 
      property_id: property.id, 
      visible: true,
      review_type: "guest_to_host"
    }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: wishlistProperties = [] } = useQuery({
    queryKey: ['wishlist-properties', user?.id],
    queryFn: () => base44.entities.WishlistProperty.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const isWishlisted = wishlistProperties.some(wp => wp.property_id === property.id);
  const wishlistItem = wishlistProperties.find(wp => wp.property_id === property.id);

  const addToWishlistMutation = useMutation({
    mutationFn: () => base44.entities.WishlistProperty.create({
      user_id: user.id,
      property_id: property.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['wishlist-properties']);
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: () => base44.entities.WishlistProperty.delete(wishlistItem.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['wishlist-properties']);
    },
  });

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    if (isWishlisted) {
      removeFromWishlistMutation.mutate();
    } else {
      addToWishlistMutation.mutate();
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const topAmenities = property.amenities?.slice(0, 4).filter(a => AMENITY_ICONS[a]) || [];
  
  return (
    <Link 
      to={createPageUrl('PropertyDetails') + `?id=${property.id}`}
      onClick={(e) => {
        if (!isAvailable) e.preventDefault();
      }}
      className={!isAvailable ? "cursor-default block h-full" : "block h-full"}
    >
      <motion.div
        whileHover={isAvailable ? { y: -4 } : {}}
        className={`bg-white rounded-2xl overflow-hidden flex flex-col h-full border border-gray-100 transition-shadow ${!isAvailable ? 'bg-gray-50' : 'hover:shadow-lg'}`}
      >
        <div className={`relative aspect-[4/3] ${!isAvailable ? 'grayscale opacity-75' : ''}`}>
          <img 
            src={mainPhoto} 
            alt={property.title}
            className="w-full h-full object-cover"
          />
          {!isAvailable && !property.suggestion && (
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-center justify-center z-10 p-2">
              <Badge className="bg-gray-900/90 text-white border-0 py-1.5 px-3 shadow-lg font-medium text-center whitespace-normal max-w-full">
                {unavailableReason || "Not available"}
              </Badge>
            </div>
          )}
          {property.featured && (
            <Badge className="absolute top-3 left-3 bg-amber-500 border-0 shadow-sm z-20">Featured</Badge>
          )}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-20">
            {(property.pets_allowed || property.children_allowed) && (
              <div className="flex flex-wrap justify-end gap-1">
                {property.pets_allowed && (
                  <Badge variant="secondary" className="bg-white/90 text-xs border-0 shadow-sm">
                    Pet-friendly
                  </Badge>
                )}
                {property.children_allowed && (
                  <Badge variant="secondary" className="bg-white/90 text-xs border-0 shadow-sm">
                    Family
                  </Badge>
                )}
              </div>
            )}
            <button
              onClick={handleToggleWishlist}
              className="bg-white/90 hover:bg-white p-2 rounded-full transition-colors shadow-sm"
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>
        
        <div className={`p-4 flex-1 flex flex-col ${!isAvailable ? 'opacity-60' : ''}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1">{property.title}</h3>
              {(property.location?.locality || property.county || property.postcode) && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[property.location?.locality, property.county, property.postcode].filter(Boolean).join(', ')}
                  {distanceMiles != null && (
                    <span className="ml-1 text-xs text-teal-600 font-medium">· {distanceMiles} mi</span>
                  )}
                </p>
              )}
            </div>
            {reviews.length > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-medium">{averageRating}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {property.guest_capacity} guests
            </span>
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
            </span>
          </div>

          {topAmenities.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              {topAmenities.map(amenity => {
                const Icon = AMENITY_ICONS[amenity];
                return (
                  <div key={amenity} className="text-gray-400" title={amenity}>
                    <Icon className="w-4 h-4" />
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="flex items-baseline gap-1 mt-auto pt-2">
            <span className="text-xl font-bold text-gray-900">£{property.nightly_rate}</span>
            <span className="text-gray-500 text-sm">/ night</span>
          </div>
        </div>

        {property.suggestion && !isAvailable && (
          <div className="bg-amber-50 border-t border-amber-100 p-3 text-xs text-amber-900 mt-auto">
             <p className="font-medium mb-2 leading-tight">{property.suggestion.message}</p>
             
             {property.suggestion.conflictDates && (
                <p className="font-semibold text-amber-800 mb-2">
                    {format(parseISO(property.suggestion.conflictDates.start), "MMM do")} - {format(parseISO(property.suggestion.conflictDates.end), "MMM do, yyyy")}
                </p>
             )}

             {property.suggestion.suggestionLabel && (
                <p className="font-medium mt-3 mb-2 leading-tight text-amber-800/90">{property.suggestion.suggestionLabel}</p>
             )}

             {property.suggestion.options && property.suggestion.options.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {property.suggestion.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => handleSuggestionClick(e, opt.checkIn, opt.duration)}
                      className="bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 px-2 py-1.5 rounded shadow-sm font-medium transition-colors text-left"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
             ) : (
                <p className="text-amber-700/80">No available dates nearby.</p>
             )}
          </div>
        )}
      </motion.div>
    </Link>
  );
}