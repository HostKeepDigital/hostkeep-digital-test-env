import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Shield, Award, MapPin, Clock, TrendingUp, Crown } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function CleanerCard({ cleaner, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="h-full hover:shadow-lg transition-all duration-300 border-gray-200">
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative h-48 bg-gradient-to-br from-teal-100 to-teal-50 rounded-t-xl overflow-hidden">
            {cleaner.profile_photo ? (
              <img 
                src={cleaner.profile_photo} 
                alt={cleaner.business_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {cleaner.business_name?.charAt(0)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Pro Badge */}
            {cleaner.subscription_plan === 'pro' && (
              <Badge className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-amber-600 border-0">
                <Crown className="w-3 h-3 mr-1" />
                Pro
              </Badge>
            )}
            
            {/* Verified Badge */}
            {cleaner.verified && (
              <Badge className="absolute top-3 right-3 bg-blue-500 border-0">
                <Shield className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          <div className="p-4">
            {/* Name & Rating */}
            <div className="mb-3">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">
                {cleaner.business_name}
              </h3>
              <div className="flex items-center gap-3 text-sm">
                {cleaner.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-gray-900">{cleaner.average_rating.toFixed(1)}</span>
                    <span className="text-gray-500">({cleaner.total_reviews})</span>
                  </div>
                )}
                {cleaner.total_jobs > 0 && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>{cleaner.total_jobs} jobs</span>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {cleaner.service_area?.city && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{cleaner.service_area.city} • {cleaner.service_area.radius_miles}mi radius</span>
              </div>
            )}

            {/* Bio Preview */}
            {cleaner.bio && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                {cleaner.bio}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-gray-500 mb-0.5">Response time</div>
                <div className="font-medium text-gray-900">
                  {cleaner.response_time_minutes < 60 
                    ? `${cleaner.response_time_minutes}min` 
                    : `${Math.round(cleaner.response_time_minutes / 60)}h`}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-gray-500 mb-0.5">Acceptance</div>
                <div className="font-medium text-gray-900">{cleaner.acceptance_rate}%</div>
              </div>
            </div>

            {/* Price & CTA */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">£{cleaner.base_price}</div>
                <div className="text-xs text-gray-500">base price</div>
              </div>
              <Link to={createPageUrl('CleanerProfile') + '?id=' + cleaner.id}>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  View Profile
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}