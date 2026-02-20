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
    <div className="space-y-6">
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
                  onValueChange={(value) => {
                    setDepositError("");
                    onUpdate("deposit_type", value);
                    onUpdate("deposit_value", null);
                  }}
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
                <Label>
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
                  className={`mt-1 ${depositError ? 'border-red-500' : ''}`}
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

      {/* Pricing Calendar */}
      <PricingCalendar
        pricingSettings={formData.pricing_settings}
        onDateClick={handleDateClick}
        selectedDates={selectedDate ? [selectedDate] : []}
      />

      {/* Nightly Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Nightly Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="base" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="base">Base Rates</TabsTrigger>
              <TabsTrigger value="seasons">Seasons</TabsTrigger>
              <TabsTrigger value="overrides">Overrides</TabsTrigger>
            </TabsList>

            <TabsContent value="base" className="space-y-4">
              <BaseRateSettings
                settings={formData.pricing_settings}
                onUpdate={(newSettings) => onUpdate('pricing_settings', newSettings)}
              />
            </TabsContent>

            <TabsContent value="seasons">
              <SeasonManager
                seasons={formData.pricing_settings?.seasons || []}
                onUpdate={(seasons) => handlePricingUpdate('seasons', seasons)}
              />
            </TabsContent>

            <TabsContent value="overrides" className="space-y-4">
              <DateOverrideManager
                overrides={formData.pricing_settings?.date_overrides || {}}
                onUpdate={(overrides) => handlePricingUpdate('date_overrides', overrides)}
                selectedDate={selectedDate}
              />
              <BulkEditManager
                overrides={formData.pricing_settings?.date_overrides || {}}
                onUpdate={(overrides) => handlePricingUpdate('date_overrides', overrides)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ExportPricing pricingSettings={formData.pricing_settings} />
    </div>
  );
}