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

        {editingRange ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Editing: {format(parseISO(editingRange.startDate), 'MMM d')} - {format(parseISO(editingRange.endDate), 'MMM d, yyyy')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingRange(null)}>Cancel</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nightly Rate (£)</Label>
                <Input
                  type="number"
                  value={editingRange.rate}
                  onChange={(e) => setEditingRange({ ...editingRange, rate: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Min Nights</Label>
                <Input
                  type="number"
                  value={editingRange.min_nights}
                  onChange={(e) => setEditingRange({ ...editingRange, min_nights: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={editingRange.note || ""}
                onChange={(e) => setEditingRange({ ...editingRange, note: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button onClick={handleUpdateRange} className="w-full">Update Range</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {ranges.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No manual overrides set. Click dates in the calendar or use the form above.</p>
            ) : (
              sortedMonths.map(monthKey => (
                <Collapsible key={monthKey} defaultOpen={true}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
                      <span className="font-semibold text-sm">{monthKey}</span>
                      <span className="text-xs text-gray-500">({rangesByMonth[monthKey].length} override{rangesByMonth[monthKey].length !== 1 ? 's' : ''})</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2 ml-6">
                    {rangesByMonth[monthKey].map((range, idx) => (
                      <div key={`${range.startDate}-${idx}`} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg group">
                        <div className="flex-1">
                          <div className="font-semibold text-sm flex items-center gap-2">
                            {range.isBulk ? (
                              <>
                                {format(parseISO(range.startDate), 'MMM d')} - {format(parseISO(range.endDate), 'MMM d, yyyy')}
                                <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">Bulk Range</span>
                              </>
                            ) : (
                              format(parseISO(range.startDate), 'EEEE, MMMM d, yyyy')
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            £{range.rate}/night
                            {range.min_nights > 1 && ` • Min ${range.min_nights} nights`}
                            {range.note && ` • ${range.note}`}
                            {range.isBulk && ` • ${range.dates.length} nights`}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleEditRange(range)}>
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRange(range)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}