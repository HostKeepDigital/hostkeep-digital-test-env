import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { 
  Search, MapPin, Star, Shield, Clock, TrendingUp, 
  Award, CheckCircle, Filter, Sparkles, Calendar as CalendarIcon
} from "lucide-react";
import CleanerCard from "@/components/cleaners/CleanerCard";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

export default function CleanerMarketplace() {
  const [searchLocation, setSearchLocation] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(200);
  const [verified, setVerified] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [selectedDate, setSelectedDate] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: availabilities = [] } = useQuery({
    queryKey: ['cleaner-availabilities', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return await base44.entities.CleanerAvailability.filter({ date: dateStr, available: true });
    },
    enabled: !!selectedDate,
  });

  const { data: cleaners = [], isLoading } = useQuery({
    queryKey: ['cleaners', searchLocation, minRating, maxPrice, verified, sortBy, selectedDate],
    queryFn: async () => {
      let query = { subscription_status: 'active', status: 'active' };
      
      if (verified === 'verified') {
        query.verified = true;
      }
      
      const results = await base44.entities.Cleaner.filter(query);
      
      // Filter by price and rating
      let filtered = results.filter(c => {
        const meetsRating = c.average_rating >= minRating;
        const meetsPrice = c.base_price <= maxPrice;
        return meetsRating && meetsPrice;
      });

      // Filter by date availability
      if (selectedDate && availabilities.length > 0) {
        const availableCleanerIds = availabilities.map(a => a.cleaner_id);
        filtered = filtered.filter(c => availableCleanerIds.includes(c.id));
      }
      
      // Sort results
      filtered.sort((a, b) => {
        if (sortBy === 'rating') return (b.average_rating || 0) - (a.average_rating || 0);
        if (sortBy === 'price_low') return (a.base_price || 0) - (b.base_price || 0);
        if (sortBy === 'price_high') return (b.base_price || 0) - (a.base_price || 0);
        if (sortBy === 'jobs') return (b.total_jobs || 0) - (a.total_jobs || 0);
        return 0;
      });
      
      // Pro cleaners get priority
      filtered.sort((a, b) => {
        if (a.subscription_plan === 'pro' && b.subscription_plan !== 'pro') return -1;
        if (b.subscription_plan === 'pro' && a.subscription_plan !== 'pro') return 1;
        return 0;
      });
      
      return filtered;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">CleanKeep Marketplace</h1>
          </div>
          <p className="text-gray-600">Find trusted cleaners for your properties</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date Needed</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Any date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                  {selectedDate && (
                    <div className="p-3 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedDate(null)}
                      >
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="City or postcode"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Min Rating</label>
              <Select value={minRating.toString()} onValueChange={(val) => setMinRating(Number(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any rating</SelectItem>
                  <SelectItem value="3">3+ stars</SelectItem>
                  <SelectItem value="4">4+ stars</SelectItem>
                  <SelectItem value="4.5">4.5+ stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Verification</label>
              <Select value={verified} onValueChange={setVerified}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cleaners</SelectItem>
                  <SelectItem value="verified">Verified only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest rated</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="jobs">Most experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Max Price: £{maxPrice}
            </label>
            <Slider
              value={[maxPrice]}
              onValueChange={([val]) => setMaxPrice(val)}
              min={20}
              max={200}
              step={5}
              className="w-full"
            />
          </div>
        </motion.div>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">
            {cleaners.length} {cleaners.length === 1 ? 'cleaner' : 'cleaners'} found
          </p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-96 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : cleaners.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No cleaners found matching your criteria</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cleaners.map((cleaner, idx) => (
              <CleanerCard key={cleaner.id} cleaner={cleaner} delay={idx * 0.1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}