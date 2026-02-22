import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";

export default function PricePreview({ cleaner, selectedServices = {} }) {
  if (!cleaner) return null;

  const basePrice = cleaner.base_price || 0;
  const services = cleaner.services || {};
  const minimumCharge = cleaner.minimum_charge || 0;

  let totalPrice = basePrice;
  const breakdown = [
    {
      label: "Base Cleaning",
      price: basePrice,
      included: true
    }
  ];

  // Add selected optional services
  if (selectedServices.laundry && services.laundry?.enabled) {
    breakdown.push({
      label: `Laundry Service (${services.laundry.pricing_type === 'per_load' ? 'per load' : 'per job'})`,
      price: services.laundry.price,
      included: true
    });
    totalPrice += services.laundry.price;
  }

  if (selectedServices.linen_change && services.linen_change?.enabled) {
    breakdown.push({
      label: "Linen Change",
      price: services.linen_change.price,
      included: true
    });
    totalPrice += services.linen_change.price;
  }

  if (selectedServices.deep_cleaning && services.deep_cleaning?.enabled) {
    breakdown.push({
      label: "Deep Cleaning",
      price: services.deep_cleaning.price,
      included: true
    });
    totalPrice += services.deep_cleaning.price;
  }

  // Apply urgency premium if enabled
  if (selectedServices.urgency_premium && services.urgency_premium?.enabled) {
    const premiumAmount = (totalPrice * services.urgency_premium.percentage) / 100;
    breakdown.push({
      label: `Urgency Premium (+${services.urgency_premium.percentage}%)`,
      price: premiumAmount,
      included: true
    });
    totalPrice += premiumAmount;
  }

  // Apply minimum charge if total is less
  if (totalPrice < minimumCharge) {
    totalPrice = minimumCharge;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Price Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {breakdown.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-semibold text-gray-900">£{item.price.toFixed(2)}</span>
          </div>
        ))}

        {minimumCharge > 0 && totalPrice <= minimumCharge && (
          <div className="py-2 text-xs text-amber-700 bg-amber-50 px-2 rounded">
            Minimum charge of £{minimumCharge.toFixed(2)} applied
          </div>
        )}

        <div className="pt-3 border-t-2 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">Total Price</span>
          <span className="text-2xl font-bold text-green-600">£{totalPrice.toFixed(2)}</span>
        </div>

        {/* Available Services Indicator */}
        {Object.entries(services).filter(([k, v]) => k !== 'urgency_premium' && v?.enabled).length > 0 && (
          <div className="pt-3 border-t">
            <div className="text-xs font-semibold text-gray-600 mb-2">Available Services from this cleaner:</div>
            <div className="flex flex-wrap gap-2">
              {services.laundry?.enabled && (
                <Badge variant="outline" className="bg-blue-50">🧺 Laundry</Badge>
              )}
              {services.linen_change?.enabled && (
                <Badge variant="outline" className="bg-blue-50">🛏️ Linen Change</Badge>
              )}
              {services.deep_cleaning?.enabled && (
                <Badge variant="outline" className="bg-blue-50">🧼 Deep Clean</Badge>
              )}
              {services.urgency_premium?.enabled && (
                <Badge variant="outline" className="bg-amber-50">⚡ Rush Available</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}