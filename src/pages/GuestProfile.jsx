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
  ArrowLeft, Save, Trash2, Plus, AlertTriangle, Crown, Ban
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
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    status: "standard"
  });
  const [newNote, setNewNote] = useState("");
  const [newIncident, setNewIncident] = useState({
    incident_type: "damage",
    description: ""
  });
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest', guestId],
    queryFn: async () => {
      const guests = await base44.entities.Guest.filter({ id: guestId });
      return guests[0];
    },
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
        status: guest.status || "standard"
      });
    }
  }, [guest]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Check for duplicate email
      if (isNew || data.email !== guest?.email) {
        const existing = await base44.entities.Guest.filter({ email: data.email, deleted: false });
        if (existing.length > 0) {
          throw new Error("A guest with this email already exists");
        }
      }

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
      if (isNew) {
        navigate(createPageUrl('GuestProfile') + `?id=${result.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    }
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
    mutationFn: async (incidentData) => {
      await base44.entities.GuestIncident.create(incidentData);
      
      // Update guest incident count and high risk flag
      const newIncidentCount = (guest.incident_count || 0) + 1;
      const isHighRisk = newIncidentCount >= 3;

      await base44.entities.Guest.update(guestId, {
        incident_count: newIncidentCount,
        high_risk: isHighRisk
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['guest'] });
      setShowIncidentDialog(false);
      setNewIncident({ incident_type: "damage", description: "" });
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
      staff_name: user.full_name,
      content: newNote
    });
  };

  const handleLogIncident = () => {
    if (!newIncident.description.trim()) return;
    incidentMutation.mutate({
      guest_id: guestId,
      ...newIncident,
      logged_by: user.id
    });
  };

  const getProperty = (propertyId) => properties.find(p => p.id === propertyId);

  const statusColors = {
    standard: "bg-gray-100 text-gray-700",
    vip: "bg-purple-100 text-purple-700",
    blacklisted: "bg-red-100 text-red-700"
  };

  if (!isNew && isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
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
                  {guest.high_risk && (
                    <Badge className="bg-red-100 text-red-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      High Risk
                    </Badge>
                  )}
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
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="bg-white border border-gray-100">
            <TabsTrigger value="info">Basic Info</TabsTrigger>
            {!isNew && (
              <>
                <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
                <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
                <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="info">
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
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({...formData, status: value})}
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
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No bookings yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookings.map((booking) => {
                        const property = getProperty(booking.property_id);
                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">{property?.title || "Unknown"}</TableCell>
                            <TableCell>{format(parseISO(booking.check_in), "MMM d, yyyy")}</TableCell>
                            <TableCell>{format(parseISO(booking.check_out), "MMM d, yyyy")}</TableCell>
                            <TableCell className="font-semibold">£{booking.total_amount}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{booking.payment_status}</Badge>
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

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add an internal note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Previous Notes</CardTitle>
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
                          {format(parseISO(note.created_date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Incidents ({incidents.length})</CardTitle>
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
                          <Badge className="bg-red-100 text-red-700">
                            {incident.incident_type.replace("_", " ")}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {format(parseISO(incident.created_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-gray-700">{incident.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log Incident</AlertDialogTitle>
              <AlertDialogDescription>
                Record an incident for this guest.
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
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="rule_violation">Rule Violation</SelectItem>
                    <SelectItem value="noise_complaint">Noise Complaint</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
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
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogIncident} className="bg-red-600 hover:bg-red-700">
                Log Incident
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Guest</AlertDialogTitle>
              <AlertDialogDescription>
                This will soft-delete the guest. Are you sure?
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