import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit, Zap, Info, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const UK_SCHOOL_HOLIDAYS = [
  { label: "Christmas 2025", start: new Date(2025, 11, 22), end: new Date(2026, 0, 2), rate: 1.30 },
  { label: "Half-term (Feb 2026)", start: new Date(2026, 1, 16), end: new Date(2026, 1, 20), rate: 1.15 },
  { label: "Easter 2026", start: new Date(2026, 3, 6), end: new Date(2026, 3, 17), rate: 1.25 },
  { label: "Half-term (May 2026)", start: new Date(2026, 4, 25), end: new Date(2026, 4, 29), rate: 1.20 },
  { label: "Summer 2026", start: new Date(2026, 6, 20), end: new Date(2026, 8, 4), rate: 1.35 },
  { label: "Half-term (Oct 2026)", start: new Date(2026, 9, 19), end: new Date(2026, 9, 23), rate: 1.20 },
  { label: "Christmas 2026", start: new Date(2026, 11, 21), end: new Date(2027, 0, 2), rate: 1.30 },
];

const UK_BANK_HOLIDAYS = [
  new Date(2026, 0, 1),
  new Date(2026, 3, 3),
  new Date(2026, 3, 6),
  new Date(2026, 4, 4),
  new Date(2026, 4, 25),
  new Date(2026, 7, 31),
  new Date(2026, 11, 25),
  new Date(2026, 11, 28),
];

const formatDate = (date) => date.toISOString().split('T')[0];

export default function SeasonManager({ seasons = [], onUpdate }) {
  const [editingSeason, setEditingSeason] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBoostInfo, setShowBoostInfo] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    nightly_rate: 100,
    weekend_modifier: 0
  });

  const handleAddSeason = () => {
    const newSeason = {
      ...formData,
      id: Date.now().toString()
    };
    onUpdate([...seasons, newSeason]);
    resetForm();
  };

  const handleUpdateSeason = () => {
    onUpdate(seasons.map(s => s.id === editingSeason ? { ...formData, id: editingSeason } : s));
    resetForm();
  };

  const handleDeleteSeason = (id) => {
    onUpdate(seasons.filter(s => s.id !== id));
  };

  const handleEdit = (season) => {
    setFormData({
      name: season.name,
      start_date: season.start_date,
      end_date: season.end_date,
      nightly_rate: season.nightly_rate,
      weekend_modifier: season.weekend_modifier || 0
    });
    setEditingSeason(season.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      nightly_rate: 100,
      weekend_modifier: 0
    });
    setEditingSeason(null);
    setShowForm(false);
  };

  const handleAutofillHolidays = () => {
    const today = new Date();
    const baseRate = seasons.length > 0 ? seasons[0].nightly_rate : 100;

    const isBankHoliday = (date) =>
      UK_BANK_HOLIDAYS.some(bh =>
        bh.getFullYear() === date.getFullYear() &&
        bh.getMonth() === date.getMonth() &&
        bh.getDate() === date.getDate()
      );

    const precedingSaturday = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const daysBack = day === 6 ? 0 : day === 0 ? 1 : day + 1;
      d.setDate(d.getDate() - daysBack);
      return d;
    };

    const followingSunday = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const daysForward = day === 0 ? 0 : 7 - day;
      d.setDate(d.getDate() + daysForward);
      const nextMonday = new Date(d);
      nextMonday.setDate(nextMonday.getDate() + 1);
      if (isBankHoliday(nextMonday)) return nextMonday;
      return d;
    };

    const isFullWeek = (start, end) => {
      const msPerDay = 86400000;
      let weekdays = 0;
      const d = new Date(start);
      while (d <= end) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) weekdays++;
        d.setTime(d.getTime() + msPerDay);
      }
      return weekdays >= 5;
    };

    const futureHolidays = UK_SCHOOL_HOLIDAYS.filter(h => h.end >= today);

    const dateOverrides = {};
    futureHolidays.forEach(holiday => {
      let start = new Date(holiday.start);
      let end = new Date(holiday.end);

      if (isFullWeek(start, end)) {
        start = precedingSaturday(start);
        end = followingSunday(end);
      }

      const msPerDay = 86400000;
      const d = new Date(start);
      while (d <= end) {
        const dateStr = formatDate(d);
        dateOverrides[dateStr] = {
          rate: Math.round(baseRate * holiday.rate),
          holiday: holiday.label
        };
        d.setTime(d.getTime() + msPerDay);
      }
    });

    // Trigger callback to update pricing settings with date overrides
    if (onUpdate) {
      onUpdate({ date_overrides: dateOverrides });
    }
  };

  const hasAutofilled = false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Seasonal Pricing</CardTitle>
            <CardDescription>Define pricing for peak seasons, holidays, and special periods</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAutofillHolidays}
              variant="outline"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              Autofill Holidays
            </Button>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Season
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Autofill price boost info panel */}
        <div className="rounded-lg border border-teal-200 bg-teal-50">
          <button
            onClick={() => setShowBoostInfo(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span className="text-sm font-medium text-teal-800">How autofill pricing works</span>
            </div>
            {showBoostInfo
              ? <ChevronUp className="w-4 h-4 text-teal-600" />
              : <ChevronDown className="w-4 h-4 text-teal-600" />}
          </button>
          {showBoostInfo && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-xs text-teal-700">
                When you press <strong>Autofill Holidays</strong>, HostKeep automatically creates seasonal pricing periods based on UK school holidays. Each period is priced as a multiplier of your base nightly rate.
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "Summer holidays", boost: "35%", detail: "Late July to early September — peak demand period" },
                  { label: "Christmas & New Year", boost: "30%", detail: "Mid-December to early January — both years" },
                  { label: "Easter", boost: "25%", detail: "Good Friday through Easter Monday week" },
                  { label: "May half-term", boost: "20%", detail: "Late May bank holiday week" },
                  { label: "October half-term", boost: "20%", detail: "Third week of October" },
                  { label: "February half-term", boost: "15%", detail: "Mid-February school break" },
                ].map(({ label, boost, detail }) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-1.5 border-b border-teal-100 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-teal-900">{label}</p>
                      <p className="text-xs text-teal-600">{detail}</p>
                    </div>
                    <span className="text-xs font-semibold text-teal-700 whitespace-nowrap">+{boost}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-teal-600 pt-1">
                Each holiday period is automatically extended to include the preceding weekend (Saturday–Sunday before) and the following weekend (Saturday–Sunday after), so guests arriving or departing around the holiday are captured at the correct rate. This only applies to full-week holidays. If a bank holiday falls on the Monday after a holiday week, that Monday is included too.
              </p>
              <p className="text-xs text-teal-600">
                All rates are calculated from your base nightly rate. You can edit or delete any autofilled period after it has been created.
              </p>
            </div>
          )}
        </div>

        {showForm && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
              <Label>Season Name</Label>
              <Input
                placeholder="e.g., Summer Peak"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Nightly Rate (£)</Label>
              <Input
                type="number"
                min="1"
                value={formData.nightly_rate}
                onChange={(e) => setFormData({ ...formData, nightly_rate: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Weekend Modifier (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="e.g., 20 for 20% increase"
                value={formData.weekend_modifier}
                onChange={(e) => setFormData({ ...formData, weekend_modifier: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Percentage increase for Fri-Sun during this season</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={editingSeason ? handleUpdateSeason : handleAddSeason} className="flex-1">
                {editingSeason ? 'Update Season' : 'Add Season'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {seasons.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No seasons defined yet. Add your first season to get started.</p>
          ) : (
            seasons.map(season => (
              <div key={season.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{season.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {season.start_date} to {season.end_date} • £{season.nightly_rate}/night
                    {season.weekend_modifier > 0 && ` • +${season.weekend_modifier}% weekends`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(season)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSeason(season.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}