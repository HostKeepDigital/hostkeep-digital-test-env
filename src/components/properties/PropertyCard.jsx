import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  MapPin,
  Users,
  Bed,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, parseISO } from "date-fns";

import { AMENITY_MAP } from "@/data/amenities";
import AmenityIcon from "@/components/AmenityIcon";

export default function PropertyCard({
  property,
  onSave,
  isAvailable = true,
  unavailableReason,
  distanceMiles,
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const handleSuggestionClick = (e, targetCheckIn, targetDuration) => {
    e.preventDefault();
    e.stopPropagation();

    const params = new URLSearchParams(window.location.search);
    if (targetCheckIn) params.set("checkIn", targetCheckIn);
    if (targetDuration) params.set("duration", targetDuration.toString());

    const url =
      createPageUrl("PropertyDetails") +
      `?id=${property.id}&${params.toString()}`;
    navigate(url);
  };

  const mainPhoto =
    property.photos?.[0] ||
    "https://lh3.googleusercontent.com/d/1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a";

  const { data: reviews = [] } = useQuery({
    queryKey: ["property-reviews", property.id],
    queryFn: () =>
      base44.entities.Review.filter({
        property_id: property.id,
        visible: true,
        review_type: "guest_to_host",
      }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: wishlistProperties = [] } = useQuery({
    queryKey: ["wishlist-properties", user?.id],
    queryFn: () =>
      base44.entities.WishlistProperty.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const isWishlisted = wishlistProperties.some(
    (wp) => wp.property_id === property.id
  );
  const wishlistItem = wishlistProperties.find(
    (wp) => wp.property_id === property.id
  );

  const addToWishlistMutation = useMutation({
    mutationFn: () =>
      base44.entities.WishlistProperty.create({
        user_id: user.id,
        property_id: property.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["wishlist-properties"]);
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: () => base44.entities.WishlistProperty.delete(wishlistItem.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["wishlist-properties"]);
    },
  });

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate("/SignIn");
      return;
    }

    if (isWishlisted) {
      removeFromWishlistMutation.mutate();
    } else {
      addToWishlistMutation.mutate();
    }
  };

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : 0;

  // Dynamic top amenities (first 4 with icons)
  const topAmenities =
    property.amenities
      ?.map((slug) => AMENITY_MAP[slug])
      .filter((a) => a?.icon)
      .slice(0, 4) || [];

  return (
    <Link
      to={createPageUrl("PropertyDetails") + `?id=${property.id}`}
      onClick={(e) => { if (!isAvailable) e.preventDefault(); }}
      className={!isAvailable ? "cursor-default block h-full" : "block h-full"}
    >
      <motion.div
        whileHover={isAvailable ? { y: -2 } : {}}
        className={`bg-white rounded-2xl overflow-hidden border border-gray-100 transition-shadow flex flex-col h-full ${
          !isAvailable ? "bg-gray-50" : "hover:shadow-lg"
        }`}
      >
        {/* Image + Content row */}
        <div className="flex flex-row sm:flex-col flex-1 min-h-0">
          {/* Image */}
          <div
            className={`relative flex-shrink-0 w-28 sm:w-auto sm:aspect-[4/3] self-stretch ${
              !isAvailable ? "grayscale opacity-75" : ""
            }`}
          >
            <img
              src={mainPhoto}
              alt={property.title}
              className="w-full h-full object-cover"
            />

            {!isAvailable && !property.suggestion && (
              <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-center justify-center z-10 p-2">
                <Badge className="bg-gray-900/90 text-white border-0 py-1 px-2 shadow-lg font-medium text-center whitespace-normal max-w-full text-xs">
                  {unavailableReason || "Not available"}
                </Badge>
              </div>
            )}

            {property.featured && (
              <Badge className="absolute top-2 left-2 bg-amber-500 border-0 shadow-sm z-20 text-xs py-0.5 px-1.5">
                Featured
              </Badge>
            )}

            <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 z-20">
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
                className="bg-white/90 hover:bg-white p-1.5 rounded-full transition-colors shadow-sm"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isWishlisted ? "text-red-500 fill-red-500" : "text-gray-600"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className={`p-3 flex-1 flex flex-col min-w-0 ${
              !isAvailable ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-1 mb-1">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-tight">
                  {property.title}
                </h3>
                {(property.location?.locality || property.county || property.postcode) && (
                  <p className="text-xs text-gray-500 flex items-center gap-0.5 mt-0.5 line-clamp-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {[property.location?.locality, property.county]
                      .filter(Boolean)
                      .join(", ")}
                    {distanceMiles != null && (
                      <span className="ml-1 text-teal-600 font-medium flex-shrink-0">
                        · {distanceMiles} mi
                      </span>
                    )}
                  </p>
                )}
              </div>
              {reviews.length > 0 && (
                <div className="flex items-center gap-0.5 text-xs flex-shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{averageRating}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
              <span className="flex items-center gap-0.5">
                <Users className="w-3.5 h-3.5" />
                {property.guest_capacity}
              </span>
              <span className="flex items-center gap-0.5">
                <Bed className="w-3.5 h-3.5" />
                {property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
              </span>

            </div>

            <div className="flex items-baseline gap-1 mt-auto">
              <span className="text-base sm:text-xl font-bold text-gray-900">
                £{property.nightly_rate}
              </span>
              <span className="text-gray-500 text-xs">/night</span>
            </div>
          </div>
        </div>

        {/* Suggestion banner — always full width below the row */}
        {property.suggestion && !isAvailable && (
          <div className="bg-amber-50 border-t border-amber-100 p-3 text-xs text-amber-900">
            <p className="font-medium mb-2 leading-tight">{property.suggestion.message}</p>
            {property.suggestion.conflictDates && (
              <p className="font-semibold text-amber-800 mb-2">
                {format(parseISO(property.suggestion.conflictDates.start), "MMM do")}
                {" - "}
                {format(parseISO(property.suggestion.conflictDates.end), "MMM do, yyyy")}
              </p>
            )}
            {property.suggestion.suggestionLabel && (
              <p className="font-medium mt-3 mb-2 leading-tight text-amber-800/90">
                {property.suggestion.suggestionLabel}
              </p>
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