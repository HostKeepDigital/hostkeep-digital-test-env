import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export default function BaseRateSettings({ settings = {}, onUpdate }) {
  const handleChange = (field, value) => {
    onUpdate({ ...settings, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Base Pricing Settings
        </CardTitle>
        <CardDescription>Default rates and rounding rules</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Base Nightly Rate (£)</Label>
          <Input
            type="number"
            min="1"
            value={settings.base_rate || 100}
            onChange={(e) => handleChange('base_rate', parseInt(e.target.value) || 0)}
            className="mt-1 text-2xl font-semibold h-14"
          />
          <p className="text-xs text-gray-500 mt-1">Default rate when no other rules apply</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Weekday Rate (£)</Label>
            <Input
              type="number"
              min="0"
              placeholder="Optional"
              value={settings.weekday_rate || ''}
              onChange={(e) => handleChange('weekday_rate', parseInt(e.target.value) || null)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Mon-Thu rate (optional)</p>
          </div>
          <div>
            <Label>Weekend Rate (£)</Label>
            <Input
              type="number"
              min="0"
              placeholder="Optional"
              value={settings.weekend_rate || ''}
              onChange={(e) => handleChange('weekend_rate', parseInt(e.target.value) || null)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Fri-Sun rate (optional)</p>
          </div>
        </div>

        <div>
          <Label>Price Rounding (£)</Label>
          <Input
            type="number"
            min="1"
            placeholder="e.g., 5 to round to nearest £5"
            value={settings.price_rounding || ''}
            onChange={(e) => handleChange('price_rounding', parseInt(e.target.value) || null)}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Round all prices to nearest X (optional)</p>
        </div>
      </CardContent>
    </Card>
  );
}