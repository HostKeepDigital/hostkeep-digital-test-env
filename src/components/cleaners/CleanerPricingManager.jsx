import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, Sparkles, AlertCircle, CheckCircle, 
  Lightbulb, TrendingUp, Zap
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function CleanerPricingManager({ cleaner, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(cleaner?.services || {
    laundry: { enabled: false, price: 20, pricing_type: "per_job" },
    linen_change: { enabled: false, price: 15 },
    deep_cleaning: { enabled: false, price: 45 },
    urgency_premium: { enabled: false, percentage: 10 }
  });

  const [basePrice, setBasePrice] = useState(cleaner?.base_price || "");
  const [minimumCharge, setMinimumCharge] = useState(cleaner?.minimum_charge || "");
  const [rateCard, setRateCard] = useState({
    studio_1bed:  cleaner?.rate_card?.studio_1bed  ?? "",
    two_bed:      cleaner?.rate_card?.two_bed      ?? "",
    three_bed:    cleaner?.rate_card?.three_bed    ?? "",
    four_bed_plus: cleaner?.rate_card?.four_bed_plus ?? "",
  });

  const handleServiceToggle = (service) => {
    setPricing(prev => ({
      ...prev,
      [service]: { ...prev[service], enabled: !prev[service].enabled }
    }));
  };

  const handleServicePrice = (service, price) => {
    setPricing(prev => ({
      ...prev,
      [service]: { ...prev[service], price: parseFloat(price) || 0 }
    }));
  };

  const handleUrgencyPercentage = (percentage) => {
    setPricing(prev => ({
      ...prev,
      urgency_premium: { ...prev.urgency_premium, percentage: parseInt(percentage) || 0 }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedRateCard = {
        studio_1bed:   parseFloat(rateCard.studio_1bed)   || 0,
        two_bed:       parseFloat(rateCard.two_bed)       || 0,
        three_bed:     parseFloat(rateCard.three_bed)     || 0,
        four_bed_plus: parseFloat(rateCard.four_bed_plus) || 0,
      };
      await base44.entities.Cleaner.update(cleaner.id, {
        base_price: parseFloat(basePrice) || 0,
        minimum_charge: parseFloat(minimumCharge) || 0,
        rate_card: updatedRateCard,
        services: pricing
      });
      
      toast.success('Pricing updated successfully');
      if (onUpdate) onUpdate({ ...cleaner, base_price: basePrice, rate_card: updatedRateCard, services: pricing });
    } catch (error) {
      toast.error('Failed to update pricing');
    } finally {
      setLoading(false);
    }
  };

  const enabledServices = Object.entries(pricing).filter(([_, s]) => s.enabled && _ !== 'urgency_premium').length;
  const showGrowthTip = enabledServices < 2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Pricing Management
          </h2>
          <p className="text-gray-600">Set your rates and service pricing</p>
        </div>
        {cleaner?.subscription_plan === 'pro' && (
          <Badge className="bg-indigo-100 text-indigo-700">Pro Features Unlocked</Badge>
        )}
      </div>

      {/* Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rate Card</CardTitle>
          <CardDescription>Your fixed cleaning rate by property size</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: "studio_1bed",   label: "Studio / 1 bed", placeholder: "65.00" },
              { key: "two_bed",       label: "2 bed",          placeholder: "80.00" },
              { key: "three_bed",     label: "3 bed",          placeholder: "100.00" },
              { key: "four_bed_plus", label: "4 bed+",         placeholder: "125.00" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-gray-500">£</span>
                  <Input
                    id={key}
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateCard[key]}
                    onChange={(e) => setRateCard(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            💡 These rates are shown to hosts before they confirm a clean. Mileage is added automatically on top.
          </p>

          <div>
            <Label htmlFor="minimum_charge">Minimum Job Charge (£)</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-600">£</span>
              <Input
                id="minimum_charge"
                type="number"
                step="0.01"
                min="0"
                value={minimumCharge}
                onChange={(e) => setMinimumCharge(e.target.value)}
                placeholder="50.00"
                className="flex-1 max-w-xs"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Lowest price you'll accept for any job</p>
          </div>
        </CardContent>
      </Card>

      {/* Add-On Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add-On Services</CardTitle>
          <CardDescription>Earn more by offering additional services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Laundry */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🧺</span>
                  <Label className="text-base font-semibold">Laundry Service</Label>
                </div>
                <p className="text-sm text-gray-600">Washing, drying, and folding guest laundry</p>
                <p className="text-xs text-gray-500 mt-1">💡 Typical range: £15–£30</p>
              </div>
              <Switch
                checked={pricing.laundry.enabled}
                onCheckedChange={() => handleServiceToggle('laundry')}
              />
            </div>

            {pricing.laundry.enabled && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="laundry_price">Price (£)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-600">£</span>
                      <Input
                        id="laundry_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricing.laundry.price}
                        onChange={(e) => handleServicePrice('laundry', e.target.value)}
                        placeholder="20.00"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="laundry_type">Pricing Type</Label>
                    <Select
                      value={pricing.laundry.pricing_type}
                      onValueChange={(val) => setPricing(prev => ({
                        ...prev,
                        laundry: { ...prev.laundry, pricing_type: val }
                      }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_job">Per Job</SelectItem>
                        <SelectItem value="per_load">Per Load</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Linen Change */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🛏️</span>
                  <Label className="text-base font-semibold">Linen Change Service</Label>
                </div>
                <p className="text-sm text-gray-600">Changing guest bed linens and preparing beds for arrival</p>
                <p className="text-xs text-gray-500 mt-1">💡 Typical range: £10–£20</p>
              </div>
              <Switch
                checked={pricing.linen_change.enabled}
                onCheckedChange={() => handleServiceToggle('linen_change')}
              />
            </div>

            {pricing.linen_change.enabled && (
              <div className="mt-4 pt-4 border-t">
                <Label htmlFor="linen_price">Price (£)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-600">£</span>
                  <Input
                    id="linen_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricing.linen_change.price}
                    onChange={(e) => handleServicePrice('linen_change', e.target.value)}
                    placeholder="15.00"
                    className="flex-1 max-w-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Deep Cleaning */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🧼</span>
                  <Label className="text-base font-semibold">Deep Cleaning Service</Label>
                </div>
                <p className="text-sm text-gray-600">Detailed cleaning including ovens, surfaces, and high-detail areas</p>
                <p className="text-xs text-gray-500 mt-1">💡 Typical range: £25–£60+ depending on property size</p>
              </div>
              <Switch
                checked={pricing.deep_cleaning.enabled}
                onCheckedChange={() => handleServiceToggle('deep_cleaning')}
              />
            </div>

            {pricing.deep_cleaning.enabled && (
              <div className="mt-4 pt-4 border-t">
                <Label htmlFor="deep_clean_price">Price (£)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-600">£</span>
                  <Input
                    id="deep_clean_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricing.deep_cleaning.price}
                    onChange={(e) => handleServicePrice('deep_cleaning', e.target.value)}
                    placeholder="45.00"
                    className="flex-1 max-w-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Urgency Premium */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Urgency Premium</CardTitle>
          <CardDescription>Add a premium for same-day or last-minute bookings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-amber-500" />
                <Label className="text-base font-semibold">Enable Urgency Premium</Label>
              </div>
              <p className="text-sm text-gray-600">Charge extra for rush bookings</p>
            </div>
            <Switch
              checked={pricing.urgency_premium.enabled}
              onCheckedChange={() => setPricing(prev => ({
                ...prev,
                urgency_premium: { ...prev.urgency_premium, enabled: !prev.urgency_premium.enabled }
              }))}
            />
          </div>

          {pricing.urgency_premium.enabled && (
            <div className="pt-4 border-t">
              <Label htmlFor="urgency_percent">Premium Percentage (%)</Label>
              <Input
                id="urgency_percent"
                type="number"
                min="0"
                max="100"
                value={pricing.urgency_premium.percentage}
                onChange={(e) => handleUrgencyPercentage(e.target.value)}
                placeholder="10"
                className="mt-1 max-w-xs"
              />
              <p className="text-xs text-gray-500 mt-1">Typical: 10% - 25%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Growth Tip */}
      {showGrowthTip && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900">Pro Tip for Growth</div>
              <p className="text-sm text-blue-800 mt-1">
                Most professional CleanKeep cleaners offer at least 2 add-on services. Pro cleaners often enable laundry and linen services to increase repeat bookings.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Preview */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg">Your Current Pricing Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Base Cleaning Rate</span>
              <span className="font-semibold">£{basePrice || '—'}</span>
            </div>
            {pricing.laundry.enabled && (
              <div className="flex items-center justify-between text-green-700">
                <span>+ Laundry Service</span>
                <span className="font-semibold">£{pricing.laundry.price}</span>
              </div>
            )}
            {pricing.linen_change.enabled && (
              <div className="flex items-center justify-between text-green-700">
                <span>+ Linen Change</span>
                <span className="font-semibold">£{pricing.linen_change.price}</span>
              </div>
            )}
            {pricing.deep_cleaning.enabled && (
              <div className="flex items-center justify-between text-green-700">
                <span>+ Deep Cleaning</span>
                <span className="font-semibold">£{pricing.deep_cleaning.price}</span>
              </div>
            )}
            {pricing.urgency_premium.enabled && (
              <div className="flex items-center justify-between text-amber-700">
                <span>+ Urgency Premium</span>
                <span className="font-semibold">{pricing.urgency_premium.percentage}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
      >
        {loading ? 'Saving...' : '💾 Save Pricing Settings'}
      </Button>
    </div>
  );
}