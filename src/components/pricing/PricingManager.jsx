import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Calendar, DollarSign, Zap } from "lucide-react";
import BaseRateSettings from "./BaseRateSettings";
import SeasonManager from "./SeasonManager";
import DateOverrideManager from "./DateOverrideManager";
import PricingCalendar from "./PricingCalendar";
import ExportPricing from "./ExportPricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";


export default function PricingManager({ formData, onUpdate, onPromptSave, property }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [depositError, setDepositError] = useState("");
  const [activeSection, setActiveSection] = useState("base");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const handlePricingUpdate = (field, value) => {
    onUpdate('pricing_settings', {
      ...formData.pricing_settings,
      [field]: value
    });
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleApplyHolidayPricing = (holidays, settings) => {
    // Add holidays as editable seasons with ±3 day buffers
    const newSeasons = (settings.seasons || []).map(s => ({ ...s }));

    holidays.forEach(holiday => {
      const startWithBuffer = new Date(holiday.start);
      startWithBuffer.setDate(startWithBuffer.getDate() - 3);
      
      const endWithBuffer = new Date(holiday.end);
      endWithBuffer.setDate(endWithBuffer.getDate() + 3);

      newSeasons.push({
        id: `holiday-${holiday.label}-${Date.now()}`,
        name: holiday.label,
        start_date: startWithBuffer.toISOString().split('T')[0],
        end_date: endWithBuffer.toISOString().split('T')[0],
        nightly_rate: Math.round((settings.base_rate || 100) * holiday.boost),
        min_nights: 1
      });
    });

    handlePricingUpdate('seasons', newSeasons);
    if (onPromptSave) onPromptSave();
  };

  const handleApplyAssistantRecommendation = (type, value) => {
    if (type === 'baseRate') {
      handlePricingUpdate('base_rate', value);
    } else if (type === 'peakSeason') {
      handlePricingUpdate('seasons', [...(formData.pricing_settings?.seasons || []), {
        id: `peak-${Date.now()}`,
        name: 'Peak Season',
        start_date: value.dates.split(' to ')[0],
        end_date: value.dates.split(' to ')[1],
        nightly_rate: value.rate
      }]);
    } else if (type === 'shoulderSeason') {
      handlePricingUpdate('seasons', [...(formData.pricing_settings?.seasons || []), {
        id: `shoulder-${Date.now()}`,
        name: 'Shoulder Season',
        start_date: value.dates.split(' to ')[0],
        end_date: value.dates.split(' to ')[1],
        nightly_rate: value.rate
      }]);
    } else if (type === 'weekendPremium') {
      const baseRate = formData.pricing_settings?.base_rate || formData.nightly_rate || 100;
      handlePricingUpdate('weekend_rate', Math.round(baseRate * (1 + value / 100)));
    } else if (type === 'date_overrides') {
      handlePricingUpdate('date_overrides', value);
    }
    if (onPromptSave) onPromptSave();
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
              onCheckedChange={(checked) => {
                onUpdate("deposit_enabled", checked);
                if (!checked && formData.deposit_value) {
                  if (onPromptSave) onPromptSave();
                }
              }}
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
                  type="number"
                  min="1"
                  value={formData.deposit_value || ""}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setDepositError("");
                    if (isNaN(value) || value < 0) {
                      onUpdate("deposit_value", 1);
                      return;
                    }
                    if (formData.deposit_type === "percentage") {
                      const cappedValue = Math.min(value, 100);
                      onUpdate("deposit_value", Math.round(cappedValue * 100) / 100);
                    } else {
                      if (value > 100) {
                        setDepositError("For deposits above £100, please use Percentage of Total Booking instead.");
                      } else {
                        onUpdate("deposit_value", Math.round(value * 100) / 100);
                      }
                    }
                  }}
                  onBlur={() => {
                    const val = formData.deposit_value;
                    if (!val || val < 1) {
                      setDepositError("A minimum booking deposit of £1 is required to process guest payments securely");
                      onUpdate("deposit_value", 1);
                      return;
                    }
                    if (formData.deposit_type === "fixed" && val > 100) {
                      setDepositError("For deposits above £100, please use Percentage of Total Booking instead.");
                      onUpdate("deposit_value", 100);
                    }
                  }}
                  placeholder={formData.deposit_type === "percentage" ? "e.g., 25" : "e.g., 50"}
                  className={`mt-1 ${depositError ? 'border-red-500' : ''}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is the amount guests pay upfront to secure their booking. Minimum {formData.deposit_type === "fixed" ? "£1" : "1%"} required.
                  {formData.deposit_type === "percentage" && " Maximum 100%."}
                  {formData.deposit_type === "fixed" && " Maximum £100."}
                </p>
                {depositError && (
                  <p className="text-xs text-red-500 mt-1">{depositError}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Nightly Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Nightly Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pricing Calendar */}
          <PricingCalendar
            pricingSettings={formData.pricing_settings}
            onDateClick={handleDateClick}
            selectedDates={selectedDate ? [selectedDate] : []}
            onApplyHolidayPricing={handleApplyHolidayPricing}
            currentMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
            nightlyRate={formData.nightly_rate || formData.pricing_settings?.base_rate}
            postcodeArea={property?.postcode_area || formData.postcode_area}
            propertyType={property?.property_type || formData.property_type}
            bedrooms={property?.bedrooms || formData.bedrooms}
          />

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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ExportPricing pricingSettings={formData.pricing_settings} />
    </div>
  );
}