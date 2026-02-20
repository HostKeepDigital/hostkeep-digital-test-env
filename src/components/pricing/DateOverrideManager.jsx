import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Calendar, ChevronRight, ChevronDown, Edit } from "lucide-react";
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function DateOverrideManager({ overrides = {}, onUpdate, selectedDate = null }) {
  const [formData, setFormData] = useState({
    date: selectedDate || "",
    rate: 100,
    min_nights: 1,
    note: ""
  });
  const [expandedRanges, setExpandedRanges] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});
  const [editingDate, setEditingDate] = useState(null);

  // Group consecutive dates with same price into bulk ranges
  const groupIntoBulkRanges = () => {
    const sortedDates = Object.keys(overrides).sort();
    const bulkRanges = [];

    let i = 0;
    while (i < sortedDates.length) {
      const startDate = sortedDates[i];
      const startInfo = overrides[startDate];
      let endDate = startDate;
      const datesInRange = [startDate];
      
      // Look ahead for consecutive dates with same rate
      while (i + 1 < sortedDates.length) {
        const nextDate = sortedDates[i + 1];
        const nextInfo = overrides[nextDate];
        const daysDiff = differenceInDays(parseISO(nextDate), parseISO(endDate));
        
        if (daysDiff === 1 && nextInfo.rate === startInfo.rate && nextInfo.min_nights === startInfo.min_nights) {
          endDate = nextDate;
          datesInRange.push(nextDate);
          i++;
        } else {
          break;
        }
      }
      
      // Group dates by month within this range
      const monthGroups = {};
      datesInRange.forEach(date => {
        const monthKey = format(parseISO(date), 'MMMM yyyy');
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(date);
      });

      bulkRanges.push({
        id: `${startDate}-${endDate}`,
        startDate,
        endDate,
        rate: startInfo.rate,
        min_nights: startInfo.min_nights,
        note: startInfo.note,
        totalNights: datesInRange.length,
        isBulk: datesInRange.length > 1,
        monthGroups
      });
      
      i++;
    }
    
    return bulkRanges;
  };

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

  const handleDeleteDate = (date) => {
    const newOverrides = { ...overrides };
    delete newOverrides[date];
    onUpdate(newOverrides);
    setEditingDate(null);
  };

  const handleDeleteMonth = (dates) => {
    const newOverrides = { ...overrides };
    dates.forEach(date => delete newOverrides[date]);
    onUpdate(newOverrides);
  };

  const handleDeleteRange = (range) => {
    const newOverrides = { ...overrides };
    Object.values(range.monthGroups).flat().forEach(date => delete newOverrides[date]);
    onUpdate(newOverrides);
  };

  const handleEditDate = (date) => {
    setEditingDate({
      date,
      ...overrides[date]
    });
  };

  const handleUpdateDate = () => {
    if (!editingDate) return;
    
    const newOverrides = {
      ...overrides,
      [editingDate.date]: {
        rate: editingDate.rate,
        min_nights: editingDate.min_nights,
        note: editingDate.note
      }
    };
    
    onUpdate(newOverrides);
    setEditingDate(null);
  };

  const toggleRange = (rangeId) => {
    setExpandedRanges(prev => ({ ...prev, [rangeId]: !prev[rangeId] }));
  };

  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const bulkRanges = groupIntoBulkRanges();

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
        {/* Add Override Form */}
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

        {/* Updated Prices Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Updated Prices</h3>
          
          {bulkRanges.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No manual overrides set. Click dates in the calendar or use the form above.</p>
          ) : (
            <div className="space-y-2">
              {bulkRanges.map((range) => (
                <div key={range.id} className="border border-purple-200 rounded-lg overflow-hidden">
                  {/* Range Header */}
                  <div className="bg-purple-50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => toggleRange(range.id)}
                        className="hover:bg-purple-100 p-1 rounded transition-colors"
                      >
                        {expandedRanges[range.id] ? (
                          <ChevronDown className="w-4 h-4 text-purple-700" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-purple-700" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {range.isBulk ? (
                            <>
                              <span>Bulk Range: {format(parseISO(range.startDate), 'MMM d')} – {format(parseISO(range.endDate), 'MMM d, yyyy')}</span>
                              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                                {range.totalNights} night{range.totalNights !== 1 ? 's' : ''}
                              </span>
                            </>
                          ) : (
                            <span>{format(parseISO(range.startDate), 'EEEE, MMMM d, yyyy')}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          £{range.rate}/night
                          {range.min_nights > 1 && ` • Min ${range.min_nights} nights`}
                          {range.note && ` • ${range.note}`}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRange(range)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Month Breakdown */}
                  {expandedRanges[range.id] && (
                    <div className="bg-white p-2 space-y-1">
                      {Object.entries(range.monthGroups).map(([monthKey, dates]) => (
                        <div key={monthKey} className="border border-gray-200 rounded">
                          {/* Month Header */}
                          <div className="bg-gray-50 p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                onClick={() => toggleMonth(`${range.id}-${monthKey}`)}
                                className="hover:bg-gray-200 p-1 rounded transition-colors"
                              >
                                {expandedMonths[`${range.id}-${monthKey}`] ? (
                                  <ChevronDown className="w-3 h-3 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-600" />
                                )}
                              </button>
                              <span className="text-sm font-medium text-gray-700">
                                {monthKey} ({dates.length} night{dates.length !== 1 ? 's' : ''})
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMonth(dates)}
                              className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete Month
                            </Button>
                          </div>

                          {/* Individual Dates */}
                          {expandedMonths[`${range.id}-${monthKey}`] && (
                            <div className="p-2 space-y-1">
                              {dates.map(date => (
                                <div
                                  key={date}
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex-1">
                                    <span className="font-medium">{format(parseISO(date), 'EEE, MMM d')}</span>
                                    <span className="text-gray-500 ml-2">• £{overrides[date].rate}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleEditDate(date)}
                                    >
                                      <Edit className="w-3 h-3 text-blue-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleDeleteDate(date)}
                                    >
                                      <Trash2 className="w-3 h-3 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Date Modal */}
        {editingDate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
              <h3 className="font-semibold text-lg">
                Edit {format(parseISO(editingDate.date), 'MMMM d, yyyy')}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Nightly Rate (£)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingDate.rate}
                    onChange={(e) => setEditingDate({ ...editingDate, rate: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Min Nights</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingDate.min_nights}
                    onChange={(e) => setEditingDate({ ...editingDate, min_nights: parseInt(e.target.value) || 1 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Note</Label>
                  <Input
                    value={editingDate.note || ""}
                    onChange={(e) => setEditingDate({ ...editingDate, note: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateDate} className="flex-1">Save Changes</Button>
                <Button variant="outline" onClick={() => setEditingDate(null)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}