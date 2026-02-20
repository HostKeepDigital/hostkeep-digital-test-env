import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function DateOverrideManager({ overrides = {}, onUpdate, selectedDate = null }) {
  const [formData, setFormData] = useState({
    date: selectedDate || "",
    rate: 100,
    min_nights: 1,
    note: ""
  });

  const handleAdd = () => {
    if (!formData.date || !formData.rate) return;
    
    const newOverrides = {
      ...overrides,
      [formData.date]: {
        rate: formData.rate,
        min_nights: formData.min_nights,
        note: formData.note
      }
    };
    onUpdate(newOverrides);
    setFormData({ date: "", rate: 100, min_nights: 1, note: "" });
  };

  const handleDelete = (date) => {
    const newOverrides = { ...overrides };
    delete newOverrides[date];
    onUpdate(newOverrides);
  };

  const sortedDates = Object.keys(overrides).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Manual Date Overrides
        </CardTitle>
        <CardDescription>Set specific pricing for holidays, events, or special dates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nightly Rate (£)</Label>
              <Input
                type="number"
                min="1"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Nights</Label>
              <Input
                type="number"
                min="1"
                value={formData.min_nights}
                onChange={(e) => setFormData({ ...formData, min_nights: parseInt(e.target.value) || 1 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Note (Optional)</Label>
              <Input
                placeholder="e.g., New Year's Eve"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <Button onClick={handleAdd} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Override
          </Button>
        </div>

        <div className="space-y-2">
          {sortedDates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No manual overrides set. Click dates in the calendar or use the form above.</p>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    £{overrides[date].rate}/night
                    {overrides[date].min_nights > 1 && ` • Min ${overrides[date].min_nights} nights`}
                    {overrides[date].note && ` • ${overrides[date].note}`}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(date)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}