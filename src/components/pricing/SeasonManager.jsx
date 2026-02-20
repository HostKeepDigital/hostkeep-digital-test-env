import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

export default function SeasonManager({ seasons = [], onUpdate }) {
  const [editingSeason, setEditingSeason] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    nightly_rate: 100,
    min_nights: 1,
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
      min_nights: season.min_nights,
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
      min_nights: 1,
      weekend_modifier: 0
    });
    setEditingSeason(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Seasonal Pricing</h3>
          <p className="text-xs text-gray-500">Peak seasons & holidays</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Min Nights</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.min_nights}
                  onChange={(e) => setFormData({ ...formData, min_nights: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
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
              {editingSeason ? 'Update' : 'Add'}
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {seasons.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No seasons yet</p>
        ) : (
          seasons.map(season => (
            <div key={season.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs truncate">{season.name}</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  £{season.nightly_rate}/nt • {season.start_date} to {season.end_date}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(season)}>
                  <Edit className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSeason(season.id)}>
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}