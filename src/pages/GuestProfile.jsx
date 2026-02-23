import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { addUserRole } from "@/components/utils/roleHelpers";

export default function GuestProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const signupMutation = useMutation({
    mutationFn: async (data) => {
      // Check for duplicate email
      const existing = await base44.entities.Guest.filter({ email: data.email, deleted: false });
      if (existing.length > 0) {
        throw new Error("A guest with this email is already registered");
      }

      // Create guest record
      const guestRecord = await base44.entities.Guest.create({
        ...data,
        status: "standard",
        total_stays: 0,
        incident_count: 0,
        high_risk: false,
        deleted: false
      });

      // Ensure user has guest role
      if (user?.id) {
        await addUserRole(user.id, 'guest');
      }

      return guestRecord;
    },
    onSuccess: () => {
      setIsComplete(true);
      toast.success("Registration complete!");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    signupMutation.mutate(formData);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for registering. You can now browse and book properties.
            </p>
            <Button onClick={() => navigate(createPageUrl('Search'))} className="bg-teal-600 hover:bg-teal-700">
              Browse Properties
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-teal-600" />
          </div>
          <CardTitle className="text-2xl">Guest Registration</CardTitle>
          <CardDescription>
            Create your guest profile to start booking properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  placeholder="John Smith"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                placeholder="+44 7700 900000"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div>
              <Label>Address</Label>
              <Textarea
                placeholder="Your full address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows={3}
              />
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-teal-600 hover:bg-teal-700"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? "Registering..." : "Complete Registration"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}