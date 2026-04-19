import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck, MapPin, Crown, Waves, Shirt, Sparkles } from "lucide-react";
import { createPageUrl } from "@/utils";

function Initials({ name }) {
  const parts = (name || "?").trim().split(/\s+/);
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0].slice(0, 2);
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2563EB] to-blue-400">
      <span className="text-3xl font-bold text-white uppercase">{letters}</span>
    </div>
  );
}

const SERVICE_CHIPS = [
  { key: "laundry",      label: "Laundry",    icon: Shirt },
  { key: "linen_change", label: "Linen",      icon: Waves },
  { key: "deep_cleaning",label: "Deep Clean", icon: Sparkles },
];

export default function CleanerCard({ cleaner, delay = 0 }) {
  const services = cleaner.services || {};
  const offeredServices = SERVICE_CHIPS.filter(
    (s) => services[s.key]?.enabled
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow flex flex-col h-full">

        {/* Photo / Avatar area */}
        <div className="relative h-48 overflow-hidden flex-shrink-0 bg-blue-50">
          {cleaner.profile_photo ? (
            <img
              src={cleaner.profile_photo}
              alt={cleaner.business_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Initials name={cleaner.business_name} />
          )}

          {/* Pro badge — top left */}
          {cleaner.subscription_plan === "pro" && (
            <Badge className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-amber-600 border-0 shadow-sm gap-1">
              <Crown className="w-3 h-3" />
              Pro
            </Badge>
          )}

          {/* Verified badge — top right */}
          {cleaner.verified && (
            <Badge className="absolute top-3 right-3 bg-green-500 border-0 shadow-sm gap-1">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1">

          {/* Name + rating row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-1">
              {cleaner.business_name}
            </h3>
            {cleaner.average_rating > 0 && (
              <div className="flex items-center gap-0.5 text-xs flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-gray-900">
                  {Number(cleaner.average_rating).toFixed(1)}
                </span>
                <span className="text-gray-400 ml-0.5">
                  ({cleaner.total_reviews || 0})
                </span>
              </div>
            )}
          </div>

          {/* Service area */}
          {cleaner.service_area?.city && (
            <p className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {cleaner.service_area.city}
              {cleaner.service_area.radius_miles
                ? ` · ${cleaner.service_area.radius_miles} mi radius`
                : ""}
            </p>
          )}

          {/* Jobs completed badge */}
          {(cleaner.total_jobs || 0) > 0 && (
            <div className="mb-3">
              <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 text-xs font-medium">
                {cleaner.total_jobs} jobs completed
              </Badge>
            </div>
          )}

          {/* Optional service chips */}
          {offeredServices.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {offeredServices.map(({ key, label, icon: Icon }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5"
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Price + CTA — pushed to bottom */}
          <div className="flex items-start justify-between mt-auto pt-3 border-t border-gray-100 gap-3">
            <div className="min-w-0">
              {cleaner.rate_card && Object.values(cleaner.rate_card).some(v => v > 0) ? (
                <>
                  <div className="space-y-0.5">
                    {[
                      { key: "studio_1bed",   label: "Studio/1 bed" },
                      { key: "two_bed",       label: "2 bed" },
                      { key: "three_bed",     label: "3 bed" },
                      { key: "four_bed_plus", label: "4 bed+" },
                    ]
                      .filter(({ key }) => (cleaner.rate_card[key] || 0) > 0)
                      .map(({ key, label }) => (
                        <p key={key} className="text-xs text-gray-700 leading-snug">
                          {label} — <span className="font-semibold">£{cleaner.rate_card[key]}</span>
                        </p>
                      ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">+ mileage at 45p/mile</p>
                </>
              ) : (
                <>
                  <span className="text-xl font-bold text-gray-900">£{cleaner.base_price}</span>
                  <p className="text-xs text-gray-500 leading-none mt-0.5">from £{cleaner.base_price} per clean</p>
                </>
              )}
            </div>
            <Link to={createPageUrl("CleanerProfile") + "?id=" + cleaner.id} className="flex-shrink-0">
              <Button className="bg-[#2563EB] hover:bg-blue-700 text-white text-sm h-9 px-4">
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}