import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import {
  Image as ImageIcon,
  Edit3,
  PoundSterling,
  Calendar,
  Settings,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isAfter, parseISO } from "date-fns";
import PublishGateModal from "./PublishGateModal";

const FOUNDER_BADGE = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostFounderBadge.png";

export default function PropertyListingCard({
  property,
  cleanerSettings,
  upcomingBookings,
  cleaningJobs,
  isSingle,
  onStatusToggle,
  onDelete,
  isFoundingMember,
  subscription,
  stripeConnected,
  foundingMemberData,
}) {
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Profile completeness score (7 criteria) — must be defined before canPublish
  const criteria = [
    property.photos?.length > 0,
    property.description?.length > 20,
    Array.isArray(property.amenities) && property.amenities.length > 0,
    property.nightly_rate > 0,
    property.ical_url || property.blocked_dates?.length > 0 || property.day_based_restrictions_enabled,
    !!(subscription && subscription.status === "active"),
    !!stripeConnected,
  ];
  const score = Math.round((criteria.filter(Boolean).length / criteria.length) * 100);
  const hasActiveSubscription = criteria[5];
  const hasStripe = criteria[6];

  // Gate check: approval approved + active subscription
  const isApproved = foundingMemberData?.approval_status === "approved";
  const gatesPass = isApproved && hasActiveSubscription;

  // Full publish requires gates + content criteria
  const canPublish = gatesPass && criteria[0] && criteria[1] && criteria[2] && criteria[3];

  const handlePublishClick = () => {
    if (!gatesPass) {
      setShowGateModal(true);
      return;
    }
    onStatusToggle();
  };

  const handleUnpublishClick = () => {
    if (propertyBookings.length > 0 || missingCleaners.length > 0) {
      setShowUnpublishDialog(true);
    } else {
      onStatusToggle();
    }
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-700",
    published: "bg-emerald-500 text-white",
    paused: "bg-amber-500 text-white",
  };

  const statusText = {
    draft: "Draft",
    published: "Active",
    paused: "Snoozed",
  };

  const hasCleaningTeam = cleanerSettings?.default_cleaner_id;
  const hasHouseRules =
    property.house_rules && property.house_rules.length > 5;
  const hasPricingRules =
    property.pricing_settings?.weekend_rate ||
    property.pricing_settings?.seasons?.length > 0;

  const propertyBookings =
    upcomingBookings?.filter(
      (b) =>
        b.property_id === property.id &&
        b.check_in &&
        isAfter(parseISO(b.check_in), new Date())
    ) || [];

  const missingCleaners = propertyBookings.filter(
    (b) =>
      !cleaningJobs?.some(
        (cj) =>
          cj.booking_id === b.id &&
          cj.status !== "cancelled" &&
          cj.status !== "declined"
      )
  );

  return (
    <div
      className={`group relative bg-white rounded-[20px] border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col ${
        isSingle ? "max-w-xl w-full" : "w-full"
      }`}
    >
      {/* Image Header */}
      <div className="relative h-72 overflow-hidden bg-gray-100">
        <img
          src={
            property.photos?.[0] ||
            "https://lh3.googleusercontent.com/d/1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a"
          }
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <Badge
          className={`absolute top-4 left-4 font-semibold border-0 shadow-sm px-3 py-1 ${
            statusColors[property.status]
          }`}
        >
          {statusText[property.status] || property.status}
        </Badge>

        {isFoundingMember && (
          <img
            src={FOUNDER_BADGE}
            alt="Founding Member"
            className="absolute bottom-4 right-4 h-10 w-auto drop-shadow-md"
          />
        )}

        <div className="absolute bottom-5 left-5 right-5 text-white">
          <h3 className="text-2xl font-bold mb-1.5 tracking-tight drop-shadow-md">
            {property.title}
          </h3>
          <p className="text-white/90 text-sm font-medium drop-shadow-md">
            {property.property_type
              ? property.property_type.charAt(0).toUpperCase() +
                property.property_type.slice(1)
              : "Property"}
            {(property.location?.locality || property.county) &&
              ` • ${[
                property.location?.locality,
                property.county,
              ]
                .filter(Boolean)
                .join(", ")}`}
          </p>
        </div>

        {/* Hover Action Bar */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
          <Link
            to={createPageUrl("EditProperty") +
              `?id=${property.id}&tab=basics`}
          >
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-xl shadow-md bg-white/95 hover:bg-white text-gray-700"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </Link>
          <Link
            to={createPageUrl("EditProperty") +
              `?id=${property.id}&tab=photos`}
          >
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-xl shadow-md bg-white/95 hover:bg-white text-gray-700"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </Link>
          <Link
            to={createPageUrl("EditProperty") +
              `?id=${property.id}&tab=pricing`}
          >
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-xl shadow-md bg-white/95 hover:bg-white text-gray-700"
            >
              <PoundSterling className="w-4 h-4" />
            </Button>
          </Link>
          <Link
            to={createPageUrl("EditProperty") +
              `?id=${property.id}&tab=booking-rules`}
          >
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-xl shadow-md bg-white/95 hover:bg-white text-gray-700"
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {missingCleaners.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Missing Cleaner Assignments
              </p>
              <p className="text-sm text-rose-700 mt-1">
                You have {missingCleaners.length} upcoming check-in
                {missingCleaners.length > 1 ? "s" : ""} without an assigned
                cleaner.
              </p>
              <Link
                to={createPageUrl("CleanKeep")}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 mt-2"
              >
                Go to CleanKeep <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-7">
          <div className="flex items-center gap-2 text-sm">
            {hasCleaningTeam ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span
              className={hasCleaningTeam ? "text-gray-700" : "text-gray-500"}
            >
              {hasCleaningTeam ? "Cleaning Team" : "No Cleaner"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {hasHouseRules ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span
              className={hasHouseRules ? "text-gray-700" : "text-gray-500"}
            >
              {hasHouseRules ? "House Rules" : "No House Rules"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {hasPricingRules ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
            )}
            <span
              className={hasPricingRules ? "text-gray-700" : "text-gray-500"}
            >
              {hasPricingRules ? "Advanced Pricing" : "Basic Pricing"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {hasActiveSubscription ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span className={hasActiveSubscription ? "text-gray-700" : "text-gray-500"}>
              {hasActiveSubscription ? "Subscribed" : "No Subscription"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {hasStripe ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span className={hasStripe ? "text-gray-700" : "text-gray-500"}>
              {hasStripe ? "Stripe Connected" : "No Stripe"}
            </span>
          </div>
        </div>

        <div className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Settings Categories
          </h4>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Photos</span>
              <span className="text-gray-500">
                {property.photos?.length || 0} uploaded
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Amenities</span>
              <span className="text-gray-500">
                {property.amenities?.length || 0} selected
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">House Rules</span>
              <span className="text-gray-500">
                {hasHouseRules ? "Configured" : "Not Set"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Cancellation</span>
              <span className="text-gray-500">Flexible</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Profile Completeness
            </span>
            <span className="text-sm font-bold text-teal-600">{score}%</span>
          </div>
          <Progress value={score} className="h-2 rounded-full" />
        </div>
      </div>

      {/* Management Action Bar */}
      <div className="bg-gray-50 border-t border-gray-100 p-4 flex items-center gap-3">
        <Link
          to={createPageUrl("EditProperty") + `?id=${property.id}`}
          className="flex-1"
        >
          <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-11 text-base">
            Manage
          </Button>
        </Link>

        {/* Publish / Unpublish Button */}
        {property.status === "published" ? (
          <Button
            onClick={handleUnpublishClick}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-11 text-sm font-semibold"
          >
            <EyeOff className="w-4 h-4 mr-1.5" /> Unpublish
          </Button>
        ) : (
          <Button
            onClick={handlePublishClick}
            className={`flex-1 rounded-xl h-11 text-sm font-semibold ${
              canPublish
                ? "bg-teal-600 hover:bg-teal-700 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Eye className="w-4 h-4 mr-1.5" /> Publish
          </Button>
        )}

        <DropdownMenu open={showActions} onOpenChange={setShowActions}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => { onDelete(); setShowActions(false); }}
              className="cursor-pointer text-rose-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span>Delete Property</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Publish Gate Modal */}
      <PublishGateModal
        open={showGateModal}
        onClose={() => setShowGateModal(false)}
        foundingMember={foundingMemberData}
      />

      {/* Unpublish Warning Dialog */}
      <AlertDialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Unpublish Property?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-gray-700">
                <p>This will remove your listing from live search results immediately.</p>
                {propertyBookings.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="font-semibold text-amber-900">⚠️ You have {propertyBookings.length} outstanding confirmed booking{propertyBookings.length > 1 ? "s" : ""}</p>
                    <p className="text-amber-800 mt-1">These guests still expect to stay. You are responsible for honouring existing bookings even after unpublishing.</p>
                  </div>
                )}
                {missingCleaners.length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                    <p className="font-semibold text-rose-900">🧹 {missingCleaners.length} booking{missingCleaners.length > 1 ? "s" : ""} without a cleaner assigned</p>
                    <p className="text-rose-800 mt-1">Make sure your cleaning team is arranged for existing bookings before unpublishing.</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Published</AlertDialogCancel>
            <AlertDialogAction
              onClick={onStatusToggle}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Unpublish Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}