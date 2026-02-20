import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday", 
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday"
};

const DEFAULT_DAY_RULE = {
  enabled: true,
  minimum_number_of_nights: null,
  rule_type: "any",
  fixed_values: []
};

const parseMultipleOf = (str) => {
  if (!str || !str.trim()) return { values: null, error: null };
  
  const parts = str.split(',').map(s => s.trim()).filter(s => s !== '');
  const numbers = [];
  
  for (const part of parts) {
    const num = parseInt(part);
    if (isNaN(num) || num !== parseFloat(part)) {
      return { values: null, error: "Please enter whole numbers between 1 and 7 only." };
    }
    if (num < 1 || num > 7) {
      return { values: null, error: "Please enter whole numbers between 1 and 7 only." };
    }
    numbers.push(num);
  }
  
  // Remove duplicates
  const unique = [...new Set(numbers)];
  return { values: unique, error: null };
};

export default function DayBasedBookingRules({ value, onChange }) {
  const [enabled, setEnabled] = useState(value?.enabled || false);
  const [rules, setRules] = useState(() => {
    const defaultRules = {};
    DAYS.forEach(day => {
      defaultRules[day] = value?.rules?.[day] || { ...DEFAULT_DAY_RULE };
    });
    return defaultRules;
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    onChange({ enabled, rules });
  }, [enabled, rules]);

  const updateDayRule = (day, field, val) => {
    setRules(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: val }
    }));
    
    // Clear error when field is updated
    if (field === "multiple_of") {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[day];
        return newErrors;
      });
    }
  };

  const parseNumberList = (str) => {
    if (!str) return [];
    return str.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n <= 28);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Day-Based Booking Restrictions</CardTitle>
            <CardDescription>Configure booking rules for specific days of the week (optional)</CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Toggle each day on/off to control bookability</li>
              <li>Set minimum stay requirement</li>
              <li>Optionally set fixed days guests can book</li>
              <li>Example: Monday with minimum 3 nights and fixed days 3, 7, 14</li>
            </ul>
          </div>

          {DAYS.map((day, idx) => (
            <div key={day}>
              {idx > 0 && <Separator className="my-4" />}
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{DAY_LABELS[day]}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {rules[day].enabled ? "Bookable" : "Restricted"}
                    </span>
                    <Switch
                      checked={rules[day].enabled}
                      onCheckedChange={(v) => updateDayRule(day, "enabled", v)}
                    />
                  </div>
                </div>

                {rules[day].enabled && (
                  <div className="pl-4 space-y-3 border-l-2 border-gray-200">
                    <div>
                      <Label className="text-xs text-gray-600">Minimum Nights Required</Label>
                      <Input
                        type="number"
                        min="1"
                        max="28"
                        value={rules[day].minimum_number_of_nights ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : null;
                          updateDayRule(day, "minimum_number_of_nights", val);
                        }}
                        placeholder="Leave empty for no minimum"
                        className="h-9"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Fixed Days (Optional)</Label>
                      <Input
                        placeholder="e.g., 3, 7, 14"
                        value={rules[day].fixed_values?.join(', ') || ''}
                        onChange={(e) => updateDayRule(day, "fixed_values", parseNumberList(e.target.value))}
                        className="h-9 mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Comma-separated values (max 28). Leave empty to allow any duration from minimum nights.</p>
                    </div>

                    <p className="text-xs text-gray-500 italic">
                      {rules[day].fixed_values?.length > 0 
                        ? `Guests can only book: ${rules[day].fixed_values.join(', ')} nights.`
                        : `Guests can book ${rules[day].minimum_number_of_nights ? `${rules[day].minimum_number_of_nights} or more` : 'any number of'} nights.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}