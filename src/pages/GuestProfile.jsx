import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, Save, Trash2, Plus, AlertTriangle, Crown, Ban,
  Calendar, PoundSterling, MessageSquare, FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export default function GuestProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const guestId = urlParams.get("id");
  const isNew = urlParams.get("new") === "true";

  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(isNew);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    nationality: "",
    date_of_birth: "",
    emergency_contact: { name: "", phone: "", relationship: "" },
    status: "standard",
    tags: []
  });
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newIncident, setNewIncident] = useState({
    incident_type: "damage_report",
    severity: "medium",
    description: "",
    claim_amount: 0
  });
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest', guestId],
    queryFn: () => base44.entities.Guest.filter({ id: guestId })[0],
    enabled: !!guestId && !isNew,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['guest-bookings', guestId],
    queryFn: () => base44.entities.Booking.filter({ guest_id: guestId }),
    enabled: !!guestId && !isNew,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
    enabled: bookings.length > 0,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['guest-notes', guestId],
    queryFn: () => base44.entities.GuestNote.filter({ guest_id: guestId }, '-created_date'),
    enabled: !!guestId && !isNew,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['guest-incidents', guestId],
    queryFn: () => base44.entities.GuestIncident.filter({ guest_id: guestId }, '-created_date'),
    enabled: !!guestId && !isNew,
  });

  useEffect(() => {
    if (guest) {
      setFormData({
        full_name: guest.full_name || "",
        email: guest.email || "",
        phone: guest.phone || "",
        address: guest.address || "",
        nationality: guest.nationality || "",
        date_of_birth: guest.date_of_birth || "",
        emergency_contact: guest.emergency_contact || { name: "", phone: "", relationship: "" },
        status: guest.status || "standard",
        tags: guest.tags || []
      });
    }
  }, [guest]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isNew) {
        return base44.entities.Guest.create(data);
      } else {
        return base44.entities.Guest.update(guestId, data);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['guest'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      toast.success(isNew ? "Guest created" : "Guest updated");
      setEditMode(false);
      if (isNew) {
        navigate(createPageUrl('GuestProfile') + `?id=${result.id}`);
      }
    },
  });

  const notesMutation = useMutation({
    mutationFn: (noteData) => base44.entities.GuestNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-notes'] });
      setNewNote("");
      toast.success("Note added");
    },
  });

  const incidentMutation = useMutation({
    mutationFn: (incidentData) => base44.entities.GuestIncident.create(incidentData),
    onSuccess: async () => {
      // Update guest incident count and risk level
      const newIncidentCount = (guest.incident_count || 0) + 1;
      let newRiskLevel = "none";
      if (newIncidentCount >= 3) newRiskLevel = "high_risk";
      else if (newIncidentCount >= 1) newRiskLevel = "warning";

      await base44.entities.Guest.update(guestId, {
        incident_count: newIncidentCount,
        risk_level: newRiskLevel
      });

      queryClient.invalidateQueries({ queryKey: ['guest-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['guest'] });
      setShowIncidentDialog(false);
      setNewIncident({
        incident_type: "damage_report",
        severity: "medium",
        description: "",
        claim_amount: 0
      });
      toast.success("Incident logged");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Guest.update(guestId, { deleted: true }),
    onSuccess: () => {
      toast.success("Guest deleted");
      navigate(createPageUrl('HostGuests'));
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    notesMutation.mutate({
      guest_id: guestId,
      staff_id: user.id,
      staff_name: user.full_name,
      content: newNote,
      internal: true
    });
  };

  const handleLogIncident = () => {
    incidentMutation.mutate({
      guest_id: guestId,
      ...newIncident,
      logged_by: user.id
    });
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag("");
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const getProperty = (propertyId) => properties.find(p => p.id === propertyId);

  const statusColors = {
    standard: "bg-gray-100 text-gray-700",
    vip: "bg-purple-100 text-purple-700",
    blacklisted: "bg-red-100 text-red-700"
  };

  const riskColors = {
    none: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    high_risk: "bg-red-100 text-red-700"
  };

  if (!isNew && isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('HostGuests'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isNew ? "New Guest" : formData.full_name}
              </h1>
              {!isNew && guest && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={statusColors[guest.status]}>
                    {guest.status === "vip" && <Crown className="w-3 h-3 mr-1" />}
                    {guest.status === "blacklisted" && <Ban className="w-3 h-3 mr-1" />}
                    {guest.status}
                  </Badge>
                  <Badge className={riskColors[guest.risk_level]}>
                    {guest.risk_level === "high_risk" && <AlertTriangle className="w-3 h-3 mr-1" />}
                    Risk: {guest.risk_level.replace("_", " ")}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isNew && (
              <Button variant="outline" className="text-red-600" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditMode(true)} className="bg-teal-600 hover:bg-teal-700">
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white border border-gray-100">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label>Nationality</Label>
                    <Input
                      value={formData.nationality}
                      onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({...formData, status: value})}
                      disabled={!editMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="blacklisted">Blacklisted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1">
                        {tag}
                        {editMode && (
                          <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-600">×</button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {editMode && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                      />
                      <Button onClick={addTag} variant="outline">Add</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={formData.emergency_contact.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: {...formData.emergency_contact, name: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.emergency_contact.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: {...formData.emergency_contact, phone: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Input
                      value={formData.emergency_contact.relationship}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: {...formData.emergency_contact, relationship: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isNew && guest && (
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Lifetime Spend</p>
                      <p className="text-2xl font-bold text-gray-900">£{guest.lifetime_spend.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Refunds</p>
                      <p className="text-2xl font-bold text-red-600">£{guest.total_refunds.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Outstanding Balance</p>
                      <p className="text-2xl font-bold text-amber-600">£{guest.outstanding_balance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Damage Claims</p>
                      <p className="text-2xl font-bold text-red-600">£{guest.total_damage_claims.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No bookings yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookings.map((booking) => {
                        const property = getProperty(booking.property_id);
                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">{property?.title || "Unknown"}</TableCell>
                            <TableCell className="text-gray-600">{booking.id.slice(0, 8)}</TableCell>
                            <TableCell>{format(parseISO(booking.check_in), "MMM d, yyyy")}</TableCell>
                            <TableCell>{format(parseISO(booking.check_out), "MMM d, yyyy")}</TableCell>
                            <TableCell>{booking.guests_count}</TableCell>
                            <TableCell className="font-semibold">£{booking.total_amount}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{booking.booking_status}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Internal Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add a private note about this guest..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} className="bg-teal-600 hover:bg-teal-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Note History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No notes yet</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="border-l-2 border-teal-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{note.staff_name}</span>
                        <span className="text-sm text-gray-500">
                          {format(parseISO(note.created_date), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Incident Tracking</CardTitle>
                <Button onClick={() => setShowIncidentDialog(true)} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Log Incident
                </Button>
              </CardHeader>
              <CardContent>
                {incidents.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No incidents logged</p>
                ) : (
                  <div className="space-y-4">
                    {incidents.map((incident) => (
                      <div key={incident.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge className={
                              incident.severity === "high" ? "bg-red-100 text-red-700" :
                              incident.severity === "medium" ? "bg-amber-100 text-amber-700" :
                              "bg-blue-100 text-blue-700"
                            }>
                              {incident.incident_type.replace("_", " ")}
                            </Badge>
                            <p className="text-sm text-gray-500 mt-1">
                              {format(parseISO(incident.created_date), "MMM d, yyyy")}
                            </p>
                          </div>
                          {incident.claim_amount > 0 && (
                            <span className="font-semibold text-red-600">£{incident.claim_amount}</span>
                          )}
                        </div>
                        <p className="text-gray-700">{incident.description}</p>
                        {incident.resolved && (
                          <Badge className="mt-2 bg-emerald-100 text-emerald-700">Resolved</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Log Incident Dialog */}
        <AlertDialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log Incident</AlertDialogTitle>
              <AlertDialogDescription>
                Record an incident for this guest. This will update their risk level.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Incident Type</Label>
                <Select
                  value={newIncident.incident_type}
                  onValueChange={(value) => setNewIncident({...newIncident, incident_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage_report">Damage Report</SelectItem>
                    <SelectItem value="rule_violation">Rule Violation</SelectItem>
                    <SelectItem value="noise_complaint">Noise Complaint</SelectItem>
                    <SelectItem value="late_checkout">Late Checkout</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                    <SelectItem value="chargeback">Chargeback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select
                  value={newIncident.severity}
                  onValueChange={(value) => setNewIncident({...newIncident, severity: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label>Claim Amount (£)</Label>
                <Input
                  type="number"
                  value={newIncident.claim_amount}
                  onChange={(e) => setNewIncident({...newIncident, claim_amount: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogIncident} className="bg-red-600 hover:bg-red-700">
                Log Incident
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Guest</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? This will soft-delete the guest from your system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}