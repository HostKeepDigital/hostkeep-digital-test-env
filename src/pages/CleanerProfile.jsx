import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Star, Shield, Award, MapPin, Clock, TrendingUp, Crown, 
  MessageSquare, Heart, Share2, CheckCircle, Calendar, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function CleanerProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const cleanerId = urlParams.get("id");

  const { user, isAuthenticated } = useAuth();   // ← custom auth

  const [selectedProperty, setSelectedProperty] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch cleaner
  const { data: cleaner, isLoading } = useQuery({
    queryKey: ["cleaner", cleanerId],
    queryFn: async () => {
      const results = await base44.entities.Cleaner.filter({ id: cleanerId });
      return results[0];
    },
    enabled: !!cleanerId,
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["cleaner-reviews", cleanerId],
    queryFn: () =>
      base44.entities.CleanerReview.filter({
        cleaner_id: cleanerId,
        visible: true,
      }),
    enabled: !!cleanerId,
  });

  // Fetch host properties
  const { data: myProperties = [] } = useQuery({
    queryKey: ["my-properties", user?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: user?.id }),
    enabled: !!user?.id,
  });

  // Assign cleaner to property
  const assignMutation = useMutation({
    mutationFn: async (propertyId) => {
      const existing = await base44.entities.PropertyCleanerSettings.filter({
        property_id: propertyId,
      });

      const data = {
        property_id: propertyId,
        host_id: user.id,
        default_cleaner_id: cleanerId,
        cleaner_base_price: cleaner.base_price,
        fee_strategy: "match_cleaner",
        fee_amount: cleaner.base_price,
        auto_schedule: true,
      };

      if (existing[0]) {
        return base44.entities.PropertyCleanerSettings.update(existing[0].id, data);
      } else {
        return base44.entities.PropertyCleanerSettings.create(data);
      }
    },
    onSuccess: () => {
      toast.success("Default cleaner assigned successfully!");
      setShowAssignDialog(false);
      queryClient.invalidateQueries({ queryKey: ["property-cleaner-settings"] });
    },
  });

  if (isLoading || !cleaner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const avgQuality =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.quality_rating || 0), 0) /
          reviews.filter((r) => r.quality_rating).length
        ).toFixed(1)
      : 0;

  const avgReliability =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.reliability_rating || 0), 0) /
          reviews.filter((r) => r.reliability_rating).length
        ).toFixed(1)
      : 0;

  const avgCommunication =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.communication_rating || 0), 0) /
          reviews.filter((r) => r.communication_rating).length
        ).toFixed(1)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-12">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-6 items-start"
          >
            <div className="w-32 h-32 rounded-2xl bg-white overflow-hidden flex-shrink-0">
              {cleaner.profile_photo ? (
                <img
                  src={cleaner.profile_photo}
                  alt={cleaner.business_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                  <span className="text-5xl font-bold text-blue-600">
                    {cleaner.business_name?.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <h1 className="text-3xl font-bold">{cleaner.business_name}</h1>

                {cleaner.subscription_plan === "pro" && (
                  <Badge className="bg-amber-500 border-0">
                    <Crown className="w-3 h-3 mr-1" />
                    Pro
                  </Badge>
                )}

                {cleaner.verified && (
                  <Badge className="bg-blue-500 border-0">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mb-4">
                {cleaner.average_rating > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-white" />
                    <span className="text-xl font-semibold">
                      {cleaner.average_rating.toFixed(1)}
                    </span>
                    <span className="text-teal-100">
                      ({cleaner.total_reviews} reviews)
                    </span>
                  </div>
                )}

                {cleaner.total_jobs > 0 && (
                  <div className="flex items-center gap-2 text-teal-100">
                    <TrendingUp className="w-5 h-5" />
                    <span>{cleaner.total_jobs} completed jobs</span>
                  </div>
                )}
              </div>

              {cleaner.service_area?.city && (
                <div className="flex items-center gap-2 text-teal-100 mb-4">
                  <MapPin className="w-5 h-5" />
                  <span>
                    Services {cleaner.service_area.city} •{" "}
                    {cleaner.service_area.radius_miles} mile radius
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                {/* Assign Cleaner */}
                {isAuthenticated && (
                  <Dialog
                    open={showAssignDialog}
                    onOpenChange={setShowAssignDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-white text-blue-700 hover:bg-blue-50">
                        Assign to Property
                      </Button>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Assign {cleaner.business_name} to Property
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Select Property
                          </label>

                          <Select
                            value={selectedProperty}
                            onValueChange={setSelectedProperty}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a property" />
                            </SelectTrigger>

                            <SelectContent>
                              {myProperties.map((prop) => (
                                <SelectItem key={prop.id} value={prop.id}>
                                  {prop.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={
                            !selectedProperty || assignMutation.isPending
                          }
                          onClick={() =>
                            assignMutation.mutate(selectedProperty)
                          }
                        >
                          {assignMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Assigning...
                            </>
                          ) : (
                            "Assign as Default Cleaner"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 -mt-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid gap-6">
              {/* Bio */}
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {cleaner.bio || "No description provided."}
                  </p>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500 mb-1">
                      Response Time
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {cleaner.response_time_minutes < 60
                        ? `${cleaner.response_time_minutes}min`
                        : `${Math.round(
                            cleaner.response_time_minutes / 60
                          )}h`}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500 mb-1">
                      Acceptance Rate
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {cleaner.acceptance_rate}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500 mb-1">
                      Avg Duration
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {cleaner.average_duration_hours}h
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500 mb-1">
                      Max Jobs/Day
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {cleaner.max_jobs_per_day}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Verification */}
              <Card>
                <CardHeader>
                  <CardTitle>Verification & Trust</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {cleaner.verified ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span
                        className={
                          cleaner.verified ? "text-gray-900" : "text-gray-500"
                        }
                      >
                        Identity Verified
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {cleaner.insurance_verified ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span
                        className={
                          cleaner.insurance_verified
                            ? "text-gray-900"
                            : "text-gray-500"
                        }
                      >
                        Insurance Verified
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pricing */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-700 mb-1">Base Price</div>
                    <div className="text-3xl font-bold text-blue-900">
                      £{cleaner.base_price}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Per Bedroom
                      </div>
                      <div className="text-xl font-semibold text-gray-900">
                        +£{cleaner.price_per_bedroom || 0}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Per Bathroom
                      </div>
                      <div className="text-xl font-semibold text-gray-900">
                        +£{cleaner.price_per_bathroom || 0}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-700 mb-1">
                      Minimum Charge
                    </div>
                    <div className="text-xl font-semibold text-blue-900">
                      £{cleaner.minimum_charge}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                    <strong>Example:</strong> A 3-bedroom, 2-bathroom property
                    would cost approximately:
                    <div className="mt-2 text-gray-900 font-medium">
                      £{cleaner.base_price} + (3 × £
                      {cleaner.price_per_bedroom || 0}) + (2 × £
                      {cleaner.price_per_bathroom || 0}) = £
                      {cleaner.base_price +
                        3 * (cleaner.price_per_bedroom || 0) +
                        2 * (cleaner.price_per_bathroom || 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews">
            <div className="space-y-6">
              {reviews.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gray-900 mb-1">
                          {cleaner.average_rating.toFixed(1)}
                        </div>

                        <div className="flex items-center justify-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i <= cleaner.average_rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>

                        <div className="text-sm text-gray-500">
                          {reviews.length} reviews
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">
                          Quality
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {avgQuality}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">
                          Reliability
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {avgReliability}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">
                          Communication
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {avgCommunication}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No reviews yet</p>
                  </CardContent>
                </Card>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i <= review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(review.created_date).toLocaleDateString()}
                          </div>
                        </div>

                        {review.would_recommend && (
                          <Badge className="bg-green-100 text-green-700 border-0">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                      </div>

                      <p className="text-gray-700 leading-relaxed mb-3">
                        {review.comment}
                      </p>

                      {review.cleaner_response && (
                        <div className="bg-gray-50 rounded-lg p-4 mt-3 border-l-4 border-blue-500">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            Response from {cleaner.business_name}
                          </div>
                          <p className="text-sm text-gray-600">
                            {review.cleaner_response}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Portfolio */}
          <TabsContent value="portfolio">
            {cleaner.portfolio_photos?.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {cleaner.portfolio_photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-xl overflow-hidden bg-gray-200"
                  >
                    <img
                      src={photo}
                      alt={`Work ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500">No portfolio images available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}