import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, Bed, Heart, Wifi, Car, Waves, ChefHat } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const AMENITY_ICONS = {
  "WiFi": Wifi,
  "Parking": Car,
  "Pool": Waves,
  "Kitchen": ChefHat,
};

export default function PropertyCard({ property, onSave }) {
  const mainPhoto = property.photos?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600";

  const { data: reviews = [] } = useQuery({
    queryKey: ['property-reviews', property.id],
    queryFn: () => base44.entities.Review.filter({ 
      property_id: property.id, 
      visible: true,
      review_type: "guest_to_host"
    }),
    staleTime: 5 * 60 * 1000,
  });

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const topAmenities = property.amenities?.slice(0, 4).filter(a => AMENITY_ICONS[a]) || [];
  
  return (
    <Link to={createPageUrl('PropertyDetails') + `?id=${property.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow"
      >
        <div className="relative aspect-[4/3]">
          <img 
            src={mainPhoto} 
            alt={property.title}
            className="w-full h-full object-cover"
          />
          {property.featured && (
            <Badge className="absolute top-3 left-3 bg-amber-500 border-0">Featured</Badge>
          )}
          {(property.pets_allowed || property.children_allowed) && (
            <div className="absolute top-3 right-3 flex gap-1">
              {property.pets_allowed && (
                <Badge variant="secondary" className="bg-white/90 text-xs border-0">
                  Pet-friendly
                </Badge>
              )}
              {property.children_allowed && (
                <Badge variant="secondary" className="bg-white/90 text-xs border-0">
                  Family
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1">{property.title}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {property.location?.town_city || property.location?.city || 'Location TBC'}
              </p>
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
          
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">£{property.nightly_rate}</span>
            <span className="text-gray-500 text-sm">/ night</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}