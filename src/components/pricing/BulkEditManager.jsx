import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { eachDayOfInterval, parseISO, format } from "date-fns";

export default function BulkEditManager({ overrides = {}, onUpdate }) {
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    rate: 100,
    min_nights: 1
  });

  const handleBulkApply = () => {
    if (!formData.start_date || !formData.end_date || !formData.rate) return;

    const start = parseISO(formData.start_date);
    const end = parseISO(formData.end_date);
    const dates = eachDayOfInterval({ start, end });

    const newOverrides = { ...overrides };
    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      newOverrides[dateStr] = {
        rate: formData.rate,
        min_nights: formData.min_nights,
        note: `Bulk edit ${formData.start_date} to ${formData.end_date}`
      };
    });

    onUpdate(newOverrides);
    setFormData({ start_date: "", end_date: "", rate: 100, min_nights: 1 });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Bulk Date Range Edit
        </CardTitle>
        <CardDescription>Apply pricing to multiple dates at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: parseInt(e.target.value) || 0 })}
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
        <Button onClick={handleBulkApply} className="w-full">
          Apply to Date Range
        </Button>
      </CardContent>
    </Card>
  );
}