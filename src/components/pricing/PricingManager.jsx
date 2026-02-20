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
import { Button } from "@/components/ui/button";

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Pricing Controls (2/3 width) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Basic Fees */}
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

        {/* Nightly Pricing Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nightly Pricing</CardTitle>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></div>
                  <span className="text-gray-600">Override</span>
                </div>
                <span className="text-gray-300">→</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
                  <span className="text-gray-600">Season</span>
                </div>
                <span className="text-gray-300">→</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                  <span className="text-gray-600">Weekend</span>
                </div>
                <span className="text-gray-300">→</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
                  <span className="text-gray-600">Base</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Section Toggles */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button
                variant={activeSection === "base" ? "default" : "outline"}
                onClick={() => setActiveSection("base")}
                className="h-auto py-3"
              >
                <div className="flex flex-col items-center gap-1">
                  <Settings className="w-4 h-4" />
                  <span className="text-xs font-medium">Base Rate</span>
                </div>
              </Button>
              <Button
                variant={activeSection === "seasons" ? "default" : "outline"}
                onClick={() => setActiveSection("seasons")}
                className="h-auto py-3"
              >
                <div className="flex flex-col items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">Seasons</span>
                </div>
              </Button>
              <Button
                variant={activeSection === "overrides" ? "default" : "outline"}
                onClick={() => setActiveSection("overrides")}
                className="h-auto py-3"
              >
                <div className="flex flex-col items-center gap-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-medium">Overrides</span>
                </div>
              </Button>
            </div>

            {/* Active Section Content */}
            <div className="border-t pt-4">
              {activeSection === "base" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Base Nightly Rate (£)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.pricing_settings?.base_rate || 100}
                      onChange={(e) => handlePricingUpdate('base_rate', parseInt(e.target.value) || 0)}
                      className="mt-2 text-2xl font-semibold h-14"
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
                        value={formData.pricing_settings?.weekday_rate || ''}
                        onChange={(e) => handlePricingUpdate('weekday_rate', parseInt(e.target.value) || null)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Mon-Thu</p>
                    </div>
                    <div>
                      <Label>Weekend Rate (£)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Optional"
                        value={formData.pricing_settings?.weekend_rate || ''}
                        onChange={(e) => handlePricingUpdate('weekend_rate', parseInt(e.target.value) || null)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Fri-Sun</p>
                    </div>
                  </div>

                  <div>
                    <Label>Price Rounding (£)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g., 5"
                      value={formData.pricing_settings?.price_rounding || ''}
                      onChange={(e) => handlePricingUpdate('price_rounding', parseInt(e.target.value) || null)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Round to nearest (optional)</p>
                  </div>
                </div>
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
          </CardContent>
        </Card>

        {/* Booking Deposit */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Deposit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Deposit Requirement</Label>
                <p className="text-sm text-gray-500">Require guests to pay a deposit</p>
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
                        Percentage of total (%)
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
                  <Label className="font-semibold">
                    {formData.deposit_type === "fixed" ? "Deposit Amount (£)" : "Deposit Percentage (%)"}
                  </Label>
                  <Input
                    type="text"
                    value={formData.deposit_value || ""}
                    onChange={(e) => {
                      const cleanValue = e.target.value.replace(/,/g, '');
                      const value = parseFloat(cleanValue);
                      
                      setDepositError("");
                      
                      if (value < 0 || isNaN(value)) {
                        onUpdate("deposit_value", 0);
                        return;
                      }
                      
                      if (formData.deposit_type === "percentage") {
                        const cappedValue = Math.min(value, 100);
                        const roundedValue = Math.round(cappedValue * 100) / 100;
                        onUpdate("deposit_value", roundedValue);
                      } else {
                        const roundedValue = Math.round(value * 100) / 100;
                        if (roundedValue > 100) {
                          setDepositError("For deposits above £100, please use Percentage of Total Booking instead.");
                        } else {
                          onUpdate("deposit_value", roundedValue);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (formData.deposit_type === "fixed" && formData.deposit_value > 100) {
                        setDepositError("For deposits above £100, please use Percentage of Total Booking instead.");
                        onUpdate("deposit_value", 100);
                      }
                    }}
                    placeholder={formData.deposit_type === "percentage" ? "e.g., 25" : "e.g., 50"}
                    className={`mt-2 text-lg font-semibold h-12 ${depositError ? 'border-red-500' : ''}`}
                  />
                  {formData.deposit_type === "percentage" && (
                    <p className="text-xs text-gray-500 mt-1">Maximum 100%</p>
                  )}
                  {formData.deposit_type === "fixed" && !depositError && (
                    <p className="text-xs text-gray-500 mt-1">Maximum £100</p>
                  )}
                  {depositError && (
                    <p className="text-xs text-red-500 mt-1">{depositError}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Calendar (Always Visible, Sticky) */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-4 space-y-4">
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