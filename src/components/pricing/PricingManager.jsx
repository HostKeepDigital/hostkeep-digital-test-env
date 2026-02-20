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

      {/* Calendar-Based Pricing */}
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Base Rates
          </TabsTrigger>
          <TabsTrigger value="seasons">
            <DollarSign className="w-4 h-4 mr-2" />
            Seasons
          </TabsTrigger>
          <TabsTrigger value="overrides">
            <Zap className="w-4 h-4 mr-2" />
            Overrides
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <PricingCalendar
            pricingSettings={formData.pricing_settings}
            onDateClick={handleDateClick}
            selectedDates={selectedDate ? [selectedDate] : []}
          />
          <ExportPricing pricingSettings={formData.pricing_settings} />
        </TabsContent>

        <TabsContent value="settings">
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
          <BulkEditManager
            overrides={formData.pricing_settings?.date_overrides || {}}
            onUpdate={(overrides) => handlePricingUpdate('date_overrides', overrides)}
          />
          <DateOverrideManager
            overrides={formData.pricing_settings?.date_overrides || {}}
            onUpdate={(overrides) => handlePricingUpdate('date_overrides', overrides)}
            selectedDate={selectedDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}