import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit, Zap } from "lucide-react";
import { format } from "date-fns";

// UK School Holidays with ±3 day buffers
const UK_SCHOOL_HOLIDAYS = [
  { label: "Christmas 2025", start: new Date(2025, 11, 15), end: new Date(2026, 0, 5), rate: 1.30 },
  { label: "Half-term (Feb)", start: new Date(2026, 1, 16), end: new Date(2026, 1, 20), rate: 1.15 },
  { label: "Easter", start: new Date(2026, 3, 6), end: new Date(2026, 3, 20), rate: 1.25 },
  { label: "Half-term (May)", start: new Date(2026, 4, 25), end: new Date(2026, 4, 29), rate: 1.20 },
  { label: "Summer", start: new Date(2026, 6, 15), end: new Date(2026, 8, 1), rate: 1.35 },
  { label: "Half-term (Oct)", start: new Date(2026, 9, 19), end: new Date(2026, 9, 23), rate: 1.20 },
  { label: "Halloween", start: new Date(2026, 10, 1), end: new Date(2026, 10, 1), rate: 1.15 },
  { label: "Christmas 2026", start: new Date(2026, 11, 15), end: new Date(2027, 0, 5), rate: 1.30 },
];

const formatDate = (date) => date.toISOString().split('T')[0];

export default function SeasonManager({ seasons = [], onUpdate }) {
  const [editingSeason, setEditingSeason] = useState(null);
  const [showForm, setShowForm] = useState(false);
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
    // Filter holidays from today onwards (up to 1 year from now)
    const today = new Date();
    const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    
    const baseRate = seasons.length > 0 ? seasons[0].nightly_rate : 100;
    const futureHolidays = UK_SCHOOL_HOLIDAYS.filter(h => h.end >= today);
    
    const newSeasons = futureHolidays.map(holiday => ({
      id: `holiday-${holiday.label}-${Date.now()}`,
      name: holiday.label,
      start_date: formatDate(holiday.start),
      end_date: formatDate(holiday.end),
      nightly_rate: Math.round(baseRate * holiday.rate),
      weekend_modifier: 0,
      min_nights: 1
    }));
    onUpdate([...seasons, ...newSeasons]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Seasonal Pricing</CardTitle>
            <CardDescription>Define pricing for peak seasons, holidays, and special periods</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAutofillHolidays} variant="outline" size="sm">
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