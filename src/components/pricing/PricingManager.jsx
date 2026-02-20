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

export default function PricingManager({ formData, onUpdate }) {
  const [selectedDate, setSelectedDate] = useState(null);

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
                type="number"
                min="0"
                value={formData.cleaning_fee}
                onChange={(e) => onUpdate("cleaning_fee", parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Security Deposit (£)</Label>
              <Input
                type="number"
                min="0"
                value={formData.security_deposit}
                onChange={(e) => onUpdate("security_deposit", parseInt(e.target.value) || 0)}
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