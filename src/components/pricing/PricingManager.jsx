import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Calendar, DollarSign, Zap } from "lucide-react";
import BaseRateSettings from "./BaseRateSettings";
import SeasonManager from "./SeasonManager";
import DateOverrideManager from "./DateOverrideManager";
import BulkEditManager from "./BulkEditManager";
import PricingCalendar from "./PricingCalendar";
import ExportPricing from "./ExportPricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function PricingManager({ formData, onUpdate }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [depositError, setDepositError] = useState("");
  const [activeSection, setActiveSection] = useState("base"); // base, seasons, overrides

  const handlePricingUpdate = (field, value) => {
    onUpdate('pricing_settings', {
      ...formData.pricing_settings,
      [field]: value
    });
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  return (
    <div className="space-y-6">
      {/* Pricing Hierarchy Info Banner */}
      <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-teal-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-gray-900 mb-2">Pricing Hierarchy - How It Works</h3>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <span className="px-2 py-1 bg-purple-100 border border-purple-300 rounded font-medium">1. Manual Overrides</span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-blue-100 border border-blue-300 rounded font-medium">2. Seasonal Rates</span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-green-100 border border-green-300 rounded font-medium">3. Weekend/Weekday</span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-medium">4. Base Rate</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">Each level overrides the previous. Calendar shows live pricing with color codes.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Fees Card */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cleaning Fee (£)</Label>
              <Input
                type="text"
                value={formData.cleaning_fee}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  onUpdate("cleaning_fee", parseInt(value) || 0);
                }}
                placeholder="e.g., 50 or 1,000"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Security Deposit (£)</Label>
              <Input
                type="text"
                value={formData.security_deposit}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  onUpdate("security_deposit", parseInt(value) || 0);
                }}
                placeholder="e.g., 200 or 2,500"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Minimum Stay (nights)</Label>
            <Input
              type="number"
              min="1"
              value={formData.minimum_stay}
              onChange={(e) => onUpdate("minimum_stay", parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in Time</Label>
              <Input 
                type="time" 
                value={formData.check_in_time} 
                onChange={(e) => onUpdate("check_in_time", e.target.value)} 
                className="mt-1" 
              />
            </div>
            <div>
              <Label>Check-out Time</Label>
              <Input 
                type="time" 
                value={formData.check_out_time} 
                onChange={(e) => onUpdate("check_out_time", e.target.value)} 
                className="mt-1" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Deposit Card */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Deposit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Deposit Requirement</Label>
              <p className="text-sm text-gray-500">Require guests to pay a deposit when booking</p>
            </div>
            <Switch
              checked={formData.deposit_enabled || false}
              onCheckedChange={(checked) => onUpdate("deposit_enabled", checked)}
            />
          </div>

          {formData.deposit_enabled && (
            <>
              <div className="space-y-3">
                <Label>Deposit Type</Label>
                <RadioGroup
                  value={formData.deposit_type || "percentage"}
                  onValueChange={(value) => onUpdate("deposit_type", value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage" className="font-normal cursor-pointer">
                      Percentage of total booking price (%)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed" className="font-normal cursor-pointer">
                      Fixed amount (£)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>
                  {formData.deposit_type === "fixed" ? "Deposit Amount (£)" : "Deposit Percentage (%)"}
                </Label>
                <Input
                  type="text"
                  value={formData.deposit_value || ""}
                  onChange={(e) => {
                    const cleanValue = e.target.value.replace(/,/g, '');
                    const value = parseFloat(cleanValue);
                    
                    // Clear error first
                    setDepositError("");
                    
                    // Prevent negative values
                    if (value < 0 || isNaN(value)) {
                      onUpdate("deposit_value", 0);
                      return;
                    }
                    
                    if (formData.deposit_type === "percentage") {
                      // Auto-cap at 100% for percentage
                      const cappedValue = Math.min(value, 100);
                      const roundedValue = Math.round(cappedValue * 100) / 100; // 2 decimal places
                      onUpdate("deposit_value", roundedValue);
                    } else {
                      // Fixed amount - validate max £100
                      const roundedValue = Math.round(value * 100) / 100; // 2 decimal places
                      if (roundedValue > 100) {
                        setDepositError("For deposits above £100, please use Percentage of Total Booking instead.");
                      } else {
                        onUpdate("deposit_value", roundedValue);
                      }
                    }
                  }}
                  onBlur={() => {
                    // Validate on blur to prevent saving invalid values
                    if (formData.deposit_type === "fixed" && formData.deposit_value > 100) {
                      setDepositError("For deposits above £100, please use Percentage of Total Booking instead.");
                      onUpdate("deposit_value", 100);
                    }
                  }}
                  placeholder={formData.deposit_type === "percentage" ? "e.g., 25" : "e.g., 50"}
                  required
                  className={`mt-1 ${depositError ? 'border-red-500' : ''}`}
                />
                {formData.deposit_type === "percentage" && (
                  <p className="text-xs text-gray-500 mt-1">Enter a value between 0-100% (max 100%)</p>
                )}
                {formData.deposit_type === "fixed" && !depositError && (
                  <p className="text-xs text-gray-500 mt-1">Maximum £100 (for higher amounts use percentage)</p>
                )}
                {depositError && (
                  <p className="text-xs text-red-500 mt-1">{depositError}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Calendar-Based Pricing - Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Section Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={activeSection === "base" ? "default" : "outline"}
                  onClick={() => setActiveSection("base")}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-xs">Base Rates</span>
                </Button>
                <Button
                  variant={activeSection === "seasons" ? "default" : "outline"}
                  onClick={() => setActiveSection("seasons")}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xs">Seasons</span>
                </Button>
                <Button
                  variant={activeSection === "overrides" ? "default" : "outline"}
                  onClick={() => setActiveSection("overrides")}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <Zap className="w-5 h-5" />
                  <span className="text-xs">Overrides</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Section Content */}
          <div className="space-y-4">
            {activeSection === "base" && (
              <BaseRateSettings
                settings={formData.pricing_settings}
                onUpdate={(newSettings) => onUpdate('pricing_settings', newSettings)}
              />
            )}

            {activeSection === "seasons" && (
              <SeasonManager
                seasons={formData.pricing_settings?.seasons || []}
                onUpdate={(seasons) => handlePricingUpdate('seasons', seasons)}
              />
            )}

            {activeSection === "overrides" && (
              <div className="space-y-4">
                <DateOverrideManager
                  overrides={formData.pricing_settings?.date_overrides || {}}
                  onUpdate={(overrides) => handlePricingUpdate('date_overrides', overrides)}
                  selectedDate={selectedDate}
                />
                <BulkEditManager
                  overrides={formData.pricing_settings?.date_overrides || {}}
                  onUpdate={(overrides) => handlePricingUpdate('date_overrides', overrides)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Calendar (Always Visible) */}
        <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
          <PricingCalendar
            pricingSettings={formData.pricing_settings}
            onDateClick={handleDateClick}
            selectedDates={selectedDate ? [selectedDate] : []}
          />
          <ExportPricing pricingSettings={formData.pricing_settings} />
        </div>
      </div>
    </div>
  );
}