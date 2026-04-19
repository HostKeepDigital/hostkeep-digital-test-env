import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CompleteJobModal({ job, onClose, onComplete }) {
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 4) {
      alert("Maximum 4 photos allowed");
      return;
    }
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    setPhotos((prev) => [...prev, ...uploaded]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    setSubmitting(true);
    await base44.entities.CleaningJob.update(job.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      completion_notes: notes,
      completion_photos: photos,
    });
    onComplete();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Job</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Completion Notes <span className="text-red-500">*</span></Label>
            <Textarea
              className="mt-1"
              rows={4}
              placeholder="Describe what was completed, any issues found, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <Label>Photos (up to 4)</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Add</span>
                    </>
                  )}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            disabled={!notes.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Mark as Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}