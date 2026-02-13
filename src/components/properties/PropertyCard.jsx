import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, Bed, Heart } from "lucide-react";
import { motion } from "framer-motion";

export default function PropertyCard({ property, onSave }) {
  const mainPhoto = property.photos?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600";
  
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
          <button
            onClick={(e) => {
              e.preventDefault();
              onSave?.(property.id);
            }}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <Heart className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1">{property.title}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {property.location?.city || 'Location TBC'}
              </p>
            </div>
            {property.average_rating > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-medium">{property.average_rating.toFixed(1)}</span>
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
          
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">£{property.nightly_rate}</span>
            <span className="text-gray-500 text-sm">/ night</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}