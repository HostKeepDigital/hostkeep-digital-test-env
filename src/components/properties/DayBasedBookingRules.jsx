import { useState, useEffect, useRef } from "react";
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
  min_days: 1,
  max_days: 28,
  rule_type: "any",
  fixed_values: [],
  multiple_of: null
};

const DEFAULT_ADVANCE_NOTICE = 0;

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
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState(value?.advance_notice_days ?? DEFAULT_ADVANCE_NOTICE);
  const [errors, setErrors] = useState({});

const isMounted = useRef(false);
useEffect(() => {
  if (!isMounted.current) { isMounted.current = true; return; }
  if (typeof onChange === "function") onChange({ enabled, rules, advance_notice_days: advanceNoticeDays });
}, [enabled, rules, advanceNoticeDays]);

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
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <Label className="text-sm font-semibold text-gray-800">Minimum Advance Notice</Label>
            <p className="text-xs text-gray-500">How many days in advance must guests book? Set to 0 to allow same-day bookings.</p>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="0"
                max="90"
                value={advanceNoticeDays}
                onChange={(e) => setAdvanceNoticeDays(parseInt(e.target.value) || 0)}
                className="h-9 w-28"
              />
              <span className="text-sm text-gray-600">
                {advanceNoticeDays === 0
                  ? "Guests can book for any date including today."
                  : `Guests must book at least ${advanceNoticeDays} day${advanceNoticeDays !== 1 ? "s" : ""} in advance.`}
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Toggle each day on/off to control bookability</li>
              <li>Set minimum and maximum stay lengths</li>
              <li>Choose allowed patterns: any length, fixed days, multiples, or combinations</li>
              <li>Example: Monday allows 4 days AND multiples of 7 (4, 7, 14, 21, 28)</li>
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className={rules[day].rule_type === "fixed_or_multiples" ? "opacity-40 pointer-events-none" : ""}>
                        <Label className="text-xs text-gray-600">Minimum Days</Label>
                        <Input
                          type="number"
                          min="1"
                          value={rules[day].min_days}
                          onChange={(e) => updateDayRule(day, "min_days", parseInt(e.target.value) || 1)}
                          className="h-9"
                          disabled={rules[day].rule_type === "fixed_or_multiples"}
                        />
                      </div>
                      <div className={rules[day].rule_type === "fixed_or_multiples" ? "opacity-40 pointer-events-none" : ""}>
                        <Label className="text-xs text-gray-600">Maximum Days</Label>
                        <Input
                          type="number"
                          min="1"
                          value={rules[day].max_days}
                          onChange={(e) => updateDayRule(day, "max_days", parseInt(e.target.value) || 28)}
                          className="h-9"
                          disabled={rules[day].rule_type === "fixed_or_multiples"}
                        />
                      </div>
                    </div>
                    {rules[day].rule_type === "fixed_or_multiples" && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        Min/max days are not used when Fixed days & Multiples is selected — exact durations are controlled below.
                      </p>
                    )}

                    <div>
                      <Label className="text-xs text-gray-600">Allowed Duration Pattern</Label>
                      <Select
                        value={rules[day].rule_type}
                        onValueChange={(v) => updateDayRule(day, "rule_type", v)}
                      >
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any number between min/max</SelectItem>
                          <SelectItem value="fixed_or_multiples">Fixed days AND multiples</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {rules[day].rule_type === "fixed" && (
                      <div>
                        <Label className="text-xs text-gray-600">Fixed Days (max 28)</Label>
                        <Input
                          placeholder="e.g., 3, 7, 14"
                          value={rules[day].fixed_values?.join(', ') || ''}
                          onChange={(e) => updateDayRule(day, "fixed_values", parseNumberList(e.target.value))}
                          className="h-9 mt-1"
                        />
                      </div>
                    )}

                    {rules[day].rule_type === "multiples" && (
                      <div>
                        <Label className="text-xs text-gray-600">Multiple Of (max 28)</Label>
                        <Input
                          placeholder="e.g., 7, 14"
                          value={Array.isArray(rules[day].multiple_of) ? rules[day].multiple_of.join(', ') : (rules[day].multiple_of || '')}
                          onChange={(e) => {
                            const values = parseNumberList(e.target.value);
                            updateDayRule(day, "multiple_of", values.length > 0 ? values : null);
                          }}
                          className="h-9 mt-1"
                        />
                      </div>
                    )}

                    {rules[day].rule_type === "fixed_or_multiples" && (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-gray-600">Fixed Days (max 28)</Label>
                          <Input
                            placeholder="e.g., 4"
                            value={rules[day].fixed_values?.join(', ') || ''}
                            onChange={(e) => {
                              const fixedValues = parseNumberList(e.target.value);
                              updateDayRule(day, "fixed_values", fixedValues);
                              
                              // Auto-update minimum days to match the lowest fixed value
                              if (fixedValues.length > 0) {
                                const minFixed = Math.min(...fixedValues);
                                updateDayRule(day, "min_days", minFixed);
                              }
                            }}
                            className="h-9 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">AND Multiple Of (max multiplier is 7)</Label>
                          <Input
                            placeholder="e.g., 1, 2, 3"
                            value={Array.isArray(rules[day].multiple_of) ? rules[day].multiple_of.join(', ') : (rules[day].multiple_of || '')}
                            onChange={(e) => {
                              const { values, error } = parseMultipleOf(e.target.value);
                              if (error) {
                                setErrors(prev => ({ ...prev, [day]: error }));
                              } else {
                                setErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors[day];
                                  return newErrors;
                                });
                              }
                              updateDayRule(day, "multiple_of", values);
                            }}
                            className={`h-9 mt-1 ${errors[day] ? 'border-red-500' : ''}`}
                          />
                          {errors[day] && (
                            <p className="text-xs text-red-500 mt-1">{errors[day]}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 italic">
                      {rules[day].rule_type === "any" && `Guests can book any stay between ${rules[day].min_days} and ${rules[day].max_days} days.`}
                      {rules[day].rule_type === "fixed" && `Guests can only book: ${rules[day].fixed_values?.join(', ') || 'not set'} days.`}
                      {rules[day].rule_type === "multiples" && `Guests can book multiples of ${Array.isArray(rules[day].multiple_of) ? rules[day].multiple_of.join(', ') : (rules[day].multiple_of || '?')}.`}
                      {rules[day].rule_type === "fixed_or_multiples" && `Guests can book ${rules[day].fixed_values?.join(', ') || '?'} days AND multiples of ${Array.isArray(rules[day].multiple_of) ? rules[day].multiple_of.join(', ') : (rules[day].multiple_of || '?')}.`}
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