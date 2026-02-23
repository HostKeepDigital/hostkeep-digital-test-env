import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Plus, MoreVertical, Edit, Eye, Pause, Play, Trash2, 
  MapPin, Users, Bed, Star, Home, Crown
} from "lucide-react";
import { toast } from "sonner";

export default function HostProperties() {
  const [user, setUser] = useState(null);
  const [deleteProperty, setDeleteProperty] = useState(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['host-properties', user?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_id: user?.id });
      return subs[0];
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Property.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-properties'] });
      toast.success("Property updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Property.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-properties'] });
      setDeleteProperty(null);
      toast.success("Property deleted");
    },
  });

  const handleAddPropertyClick = (e) => {
    // Check if on basic plan with 1 property already
    if (subscription?.plan === 'basic' && subscription?.max_properties === 1 && properties.length >= 1) {
      e.preventDefault();
      setShowUpgradeDialog(true);
    } else {
      window.location.href = createPageUrl('CreateProperty');
    }
  };

  const toggleStatus = (property) => {
    const newStatus = property.status === 'published' ? 'paused' : 'published';
    updateMutation.mutate({ id: property.id, data: { status: newStatus } });
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-700",
    published: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Your Properties</h1>
            <p className="text-gray-500">{properties.length} properties listed</p>
          </div>
          <Button 
            onClick={handleAddPropertyClick}
            className="bg-teal-600 hover:bg-teal-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </Button>
        </div>

        {properties.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white rounded-2xl border border-gray-100"
          >
            <Home className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties yet</h3>
            <p className="text-gray-500 mb-6">List your first property and start earning</p>
            <Link to={createPageUrl('CreateProperty')}>
              <Button className="bg-teal-600 hover:bg-teal-700">
                Add Your First Property
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {properties.map((property, idx) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-64 h-48 md:h-auto relative">
                    <img
                      src={property.photos?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400"}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge className={`absolute top-3 left-3 ${statusColors[property.status]}`}>
                      {property.status}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{property.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
                          <MapPin className="w-4 h-4" />
                          {property.location?.city || 'Location TBC'}, {property.location?.country || 'UK'}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('EditProperty') + `?id=${property.id}`}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('PropertyDetails') + `?id=${property.id}`}>
                              <Eye className="w-4 h-4 mr-2" /> Preview
                            </Link>
                          </DropdownMenuItem>
                          {property.status === 'published' ? (
                            <DropdownMenuItem onClick={() => toggleStatus(property)}>
                              <Pause className="w-4 h-4 mr-2" /> Pause Listing
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleStatus(property)}>
                              <Play className="w-4 h-4 mr-2" /> Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => setDeleteProperty(property)}
                            className="text-rose-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" /> {property.guest_capacity} guests
                      </span>
                      <span className="flex items-center gap-1">
                        <Bed className="w-4 h-4" /> {property.bedrooms} bedrooms
                      </span>
                      {property.average_rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          {property.average_rating.toFixed(1)} ({property.review_count})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">£{property.nightly_rate}</span>
                        <span className="text-gray-500"> / night</span>
                      </div>
                      <Link to={createPageUrl('EditProperty') + `?id=${property.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" /> Edit Property
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteProperty} onOpenChange={() => setDeleteProperty(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Property</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteProperty?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteProperty.id)}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upgrade Dialog */}
        <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <AlertDialogContent>
            <button
              onClick={() => setShowUpgradeDialog(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-violet-600" />
                Upgrade Required
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left space-y-2">
                <p>If you want to add more than one property, please see subscription upgrades.</p>
                <p className="text-sm text-gray-600">
                  Upgrade to <strong>Pro</strong> (up to 5 properties) or <strong>Premium</strong> (unlimited properties).
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction 
                onClick={() => window.location.href = createPageUrl('Subscription')}
                className="bg-violet-600 hover:bg-violet-700"
              >
                View Subscription Plans
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}