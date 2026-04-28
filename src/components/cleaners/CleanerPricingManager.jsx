import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PoundSterling, Sparkles, Zap, TrendingUp, Save, Lightbulb, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import DynamicPricingSettings from "./DynamicPricingSettings";
import PriceSimulator from "./PriceSimulator";

export default function CleanerPricingManager({ cleaner, onUpdate }) {
  const [saving, setSaving] = useState(false);

  const [rateCard, setRateCard] = useState({
    studio_1bed:   cleaner?.rate_card?.studio_1bed   ?? "",
    two_bed:       cleaner?.rate_card?.two_bed       ?? "",
    three_bed:     cleaner?.rate_card?.three_bed     ?? "",
    four_bed_plus: cleaner?.rate_card?.four_bed_plus ?? "",
  });
  const [minimumCharge, setMinimumCharge] = useState(cleaner?.minimum_charge ?? "");

  const [services, setServices] = useState(cleaner?.services || {
    laundry:        { enabled: false, price: 20, pricing_type: "per_job" },
    linen_change:   { enabled: false, price: 15 },
    deep_cleaning:  { enabled: false, price: 45 },
    urgency_premium:{ enabled: false, percentage: 10 },
  });

  const [dynamicPricing, setDynamicPricing] = useState(cleaner?.dynamic_pricing || {});

  // Build a preview-ready cleaner object that reflects live form state
  const liveCleanerPreview = {
    ...cleaner,
    rate_card: {
      studio_1bed:   parseFloat(rateCard.studio_1bed)   || 0,
      two_bed:       parseFloat(rateCard.two_bed)       || 0,
      three_bed:     parseFloat(rateCard.three_bed)     || 0,
      four_bed_plus: parseFloat(rateCard.four_bed_plus) || 0,
    },
    minimum_charge: parseFloat(minimumCharge) || 0,
    services,
    dynamic_pricing: dynamicPricing,
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        rate_card: liveCleanerPreview.rate_card,
        minimum_charge: liveCleanerPreview.minimum_charge,
        services,
        dynamic_pricing: dynamicPricing,
      };
      await base44.entities.Cleaner.update(cleaner.id, payload);
      toast.success("Pricing saved successfully");
      if (onUpdate) onUpdate({ ...cleaner, ...payload });
    } catch {
      toast.error("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (key) =>
    setServices((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));

  const setServiceField = (key, field, value) =>
    setServices((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: field === "pricing_type" ? value : parseFloat(value) || 0 },
    }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PoundSterling className="w-6 h-6 text-green-600" />
            Pricing Settings
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Set your base rates, add-ons, last-minute premiums, and seasonal multipliers
          </p>
        </div>
        {cleaner?.subscription_plan === "pro" && (
          <Badge className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1">Pro — all features unlocked</Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left: tabs */}
        <Tabs defaultValue="rates" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="rates" className="gap-1.5 text-xs">
              <PoundSterling className="w-3.5 h-3.5" /> Rate Card
            </TabsTrigger>
            <TabsTrigger value="dynamic" className="gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5" /> Dynamic Pricing
            </TabsTrigger>
            <TabsTrigger value="addons" className="gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" /> Add-Ons
            </TabsTrigger>
          </TabsList>

          {/* ── Rate Card tab ── */}
          <TabsContent value="rates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Base Rate Card</CardTitle>
                <CardDescription>Your standard cleaning rate by property size</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: "studio_1bed",   label: "Studio / 1 bed", placeholder: "65" },
                    { key: "two_bed",       label: "2 bed",          placeholder: "80" },
                    { key: "three_bed",     label: "3 bed",          placeholder: "100" },
                    { key: "four_bed_plus", label: "4 bed+",         placeholder: "125" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <Label className="text-xs text-gray-500">{label}</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-gray-400 text-sm">£</span>
                        <Input
                          type="number" step="0.01" min="0"
                          value={rateCard[key]}
                          onChange={(e) => setRateCard((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="flex-1 h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  💡 Rates shown to hosts before they confirm a clean. Mileage is added on top.
                </p>

                <div className="border-t pt-4">
                  <Label className="text-xs text-gray-500">Minimum Job Charge</Label>
                  <div className="flex items-center gap-2 mt-1 max-w-xs">
                    <span className="text-gray-400 text-sm">£</span>
                    <Input
                      type="number" step="0.01" min="0"
                      value={minimumCharge}
                      onChange={(e) => setMinimumCharge(e.target.value)}
                      placeholder="50"
                      className="flex-1 h-9"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Lowest price you'll accept for any job</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Dynamic Pricing tab ── */}
          <TabsContent value="dynamic">
            <DynamicPricingSettings
              dynamicPricing={dynamicPricing}
              onChange={setDynamicPricing}
            />
          </TabsContent>

          {/* ── Add-ons tab ── */}
          <TabsContent value="addons" className="space-y-4">
            {/* Laundry */}
            <ServiceCard
              emoji="🧺"
              title="Laundry Service"
              description="Washing, drying, and folding guest laundry"
              tipRange="£15–£30"
              enabled={services.laundry?.enabled}
              onToggle={() => toggleService("laundry")}
            >
              {services.laundry?.enabled && (
                <div className="grid md:grid-cols-2 gap-4 pt-3 mt-3 border-t">
                  <PriceInput
                    id="laundry_price"
                    label="Price (£)"
                    value={services.laundry.price}
                    onChange={(v) => setServiceField("laundry", "price", v)}
                  />
                  <div>
                    <Label htmlFor="laundry_type" className="text-xs text-gray-500">Pricing type</Label>
                    <Select
                      value={services.laundry.pricing_type}
                      onValueChange={(v) => setServiceField("laundry", "pricing_type", v)}
                    >
                      <SelectTrigger className="mt-1 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_job">Per job</SelectItem>
                        <SelectItem value="per_load">Per load</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </ServiceCard>

            {/* Linen change */}
            <ServiceCard
              emoji="🛏️"
              title="Linen Change"
              description="Changing bed linens and preparing beds for arrival"
              tipRange="£10–£20"
              enabled={services.linen_change?.enabled}
              onToggle={() => toggleService("linen_change")}
            >
              {services.linen_change?.enabled && (
                <div className="pt-3 mt-3 border-t max-w-xs">
                  <PriceInput
                    id="linen_price"
                    label="Price (£)"
                    value={services.linen_change.price}
                    onChange={(v) => setServiceField("linen_change", "price", v)}
                  />
                </div>
              )}
            </ServiceCard>

            {/* Deep cleaning */}
            <ServiceCard
              emoji="🧼"
              title="Deep Cleaning"
              description="Detailed cleaning including ovens, surfaces, and high-detail areas"
              tipRange="£25–£60+"
              enabled={services.deep_cleaning?.enabled}
              onToggle={() => toggleService("deep_cleaning")}
            >
              {services.deep_cleaning?.enabled && (
                <div className="pt-3 mt-3 border-t max-w-xs">
                  <PriceInput
                    id="deep_price"
                    label="Price (£)"
                    value={services.deep_cleaning.price}
                    onChange={(v) => setServiceField("deep_cleaning", "price", v)}
                  />
                </div>
              )}
            </ServiceCard>

            {/* Growth tip */}
            {Object.values(services).filter((s) => s.enabled).length < 2 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
                <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-blue-800">
                  <strong>Pro tip:</strong> Cleaners who offer at least 2 add-on services earn on average 23% more per job.
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Right: live simulator (sticky) */}
        <div className="lg:sticky lg:top-24">
          <PriceSimulator cleaner={liveCleanerPreview} />
        </div>
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-base font-semibold gap-2"
      >
        {saving ? (
          <>Saving…</>
        ) : (
          <><Save className="w-4 h-4" /> Save All Pricing Settings</>
        )}
      </Button>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ServiceCard({ emoji, title, description, tipRange, enabled, onToggle, children }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl">{emoji}</span>
              <span className="font-semibold text-gray-900 text-sm">{title}</span>
              {enabled && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
            <p className="text-xs text-gray-500">{description}</p>
            <p className="text-xs text-gray-400 mt-0.5">💡 Typical: {tipRange}</p>
          </div>
          <Switch checked={!!enabled} onCheckedChange={onToggle} />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function PriceInput({ id, label, value, onChange }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs text-gray-500">{label}</Label>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-gray-400 text-sm">£</span>
        <Input
          id={id}
          type="number" step="0.01" min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-9 text-sm"
        />
      </div>
    </div>
  );
}