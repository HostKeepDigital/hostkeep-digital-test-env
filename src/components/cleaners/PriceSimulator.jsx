/**
 * PriceSimulator — live price calculator for the CleanerPricing page.
 * Shows hosts exactly what a cleaner would charge given inputs.
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calculator, ArrowRight } from "lucide-react";
import { calculateCleanerPrice } from "@/utils/cleanerPricing";

export default function PriceSimulator({ cleaner }) {
  const today = new Date().toISOString().split("T")[0];
  const [bedrooms, setBedrooms] = useState(2);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [selectedServices, setSelectedServices] = useState([]);

  const services = cleaner?.services || {};
  const availableServices = Object.entries(services)
    .filter(([key, val]) => val?.enabled && key !== "urgency_premium")
    .map(([key, val]) => ({ key, label: serviceLabel(key), price: val.price }));

  function toggleService(key) {
    setSelectedServices((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const result = useMemo(() => {
    if (!cleaner) return null;
    return calculateCleanerPrice(cleaner, {
      bedrooms: Number(bedrooms),
      scheduledDate,
      bookingDate: today,
      requestedServices: selectedServices,
    });
  }, [cleaner, bedrooms, scheduledDate, selectedServices]);

  if (!cleaner) return null;

  return (
    <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-4 h-4 text-teal-600" />
          Live Price Calculator
        </CardTitle>
        <p className="text-xs text-gray-500">See exactly what a host would pay with your current settings</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Bedrooms</Label>
            <Input
              type="number" min="1" max="10"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Clean date</Label>
            <Input
              type="date"
              value={scheduledDate}
              min={today}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>

        {/* Services toggles */}
        {availableServices.length > 0 && (
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Add-on services</Label>
            <div className="flex flex-wrap gap-2">
              {availableServices.map(({ key, label, price }) => (
                <label
                  key={key}
                  className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                    selectedServices.includes(key)
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-teal-400"
                  }`}
                >
                  <Checkbox
                    checked={selectedServices.includes(key)}
                    onCheckedChange={() => toggleService(key)}
                    className="hidden"
                  />
                  {label} (+£{price})
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Breakdown */}
        {result && (
          <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
            {result.breakdown.map((line, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className={
                  line.highlight === "amber" ? "text-amber-600 font-medium" :
                  line.highlight === "blue" ? "text-blue-600 font-medium" :
                  i === 0 ? "text-gray-700" : "text-gray-500"
                }>
                  {line.highlight && "⚡ "}
                  {line.label}
                </span>
                <span className={
                  line.highlight === "amber" ? "text-amber-700 font-semibold" :
                  line.highlight === "blue" ? "text-blue-700 font-semibold" :
                  "text-gray-700"
                }>
                  +£{line.amount.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-teal-700">£{result.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Days notice badge */}
        {scheduledDate && (
          <div className="text-center">
            {(() => {
              const days = Math.ceil((new Date(scheduledDate) - new Date()) / (1000 * 60 * 60 * 24));
              if (days <= 0) return <Badge className="bg-red-100 text-red-700">⚡ Same day / overdue</Badge>;
              if (days <= 1) return <Badge className="bg-red-100 text-red-700">⚡ Same-day booking</Badge>;
              if (days <= 3) return <Badge className="bg-amber-100 text-amber-700">⚡ {days} day notice</Badge>;
              if (days <= 7) return <Badge className="bg-yellow-100 text-yellow-700">{days} days notice</Badge>;
              return <Badge className="bg-green-100 text-green-700">{days} days notice</Badge>;
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function serviceLabel(key) {
  return {
    laundry: "Laundry",
    linen_change: "Linen change",
    deep_cleaning: "Deep cleaning",
  }[key] || key;
}