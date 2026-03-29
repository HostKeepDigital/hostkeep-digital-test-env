import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  FileText,
  Clock,
  Ban,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function AdminVerifications() {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { user } = useAuth(); // custom auth admin user

  // Pending verification documents
  const { data: pendingDocs = [] } = useQuery({
    queryKey: ["pending-verifications"],
    queryFn: async () => {
      return await base44.entities.VerificationDocuments.filter(
        { verification_status: "pending" },
        "-created_date"
      );
    },
  });

  // Pending roles
  const { data: pendingRoles = [] } = useQuery({
    queryKey: ["pending-roles"],
    queryFn: async () => {
      return await base44.entities.UserRole.filter(
        { approval_status: "pending" },
        "-created_date"
      );
    },
  });

  // High-risk users
  const { data: highRiskUsers = [] } = useQuery({
    queryKey: ["high-risk-users"],
    queryFn: async () => {
      return await base44.entities.RiskScores.filter(
        { risk_level: "high" },
        "-score"
      );
    },
  });

  // Pending founding members
  const { data: pendingFoundingMembers = [] } = useQuery({
    queryKey: ["pending-founding-members"],
    queryFn: async () => {
      return await base44.entities.FoundingMember.filter(
        { approval_status: "pending" },
        "-signup_timestamp"
      );
    },
  });

  // Approve founding member
  const approveFoundingMemberMutation = useMutation({
    mutationFn: async (member) => {
      await base44.entities.FoundingMember.update(member.id, {
        approval_status: "approved",
      });

      const firstName = member.full_name.split(" ")[0];
      const tierText =
        member.role === "host" ? "Founding Host" : "Founding Cleaner";

      await base44.integrations.Core.SendEmail({
        from_name: "HostKeep Digital",
        to: member.email,
        subject: "You're confirmed — Welcome to HostKeep Digital 🌊",
        body: `... FULL EMAIL HTML ...`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-founding-members"] });
      toast.success("Founding member approved and confirmation email sent");
    },
  });

  // Reject founding member
  const rejectFoundingMemberMutation = useMutation({
    mutationFn: async (member) => {
      const allMembers = await base44.entities.FoundingMember.list();
      const cornwallMembers = allMembers.filter(
        (m) => m.approval_status !== "out_of_area" && m.id !== member.id
      );

      const roleCount = cornwallMembers.filter(
        (m) =>
          m.role === member.role &&
          (m.approval_status === "pending" ||
            m.approval_status === "approved")
      ).length;

      const limit = member.role === "host" ? 50 : 30;
      const isFull = roleCount >= limit;

      const newStatus = isFull ? "waitlist" : "rejected";

      await base44.entities.FoundingMember.update(member.id, {
        approval_status: newStatus,
      });

      const firstName = member.full_name.split(" ")[0];

      await base44.integrations.Core.SendEmail({
        from_name: "HostKeep Digital",
        to: member.email,
        subject: isFull
          ? "You're on the waitlist — HostKeep Digital 🌊"
          : "Your HostKeep Digital application — an update",
        body: `... FULL EMAIL HTML ...`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-founding-members"] });
      toast.success("Founding member rejected and notified");
    },
  });

  // Approve document (FIXED)
  const approveDocMutation = useMutation({
    mutationFn: async (docId) => {
      return await base44.entities.VerificationDocuments.update(docId, {
        verification_status: "approved",
        reviewed_by_admin_id: user.id, // replaced base44.auth.me()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-verifications"] });
      toast.success("Document approved");
    },
  });

  // Reject document (FIXED)
  const rejectDocMutation = useMutation({
    mutationFn: async ({ docId, reason }) => {
      return await base44.entities.VerificationDocuments.update(docId, {
        verification_status: "rejected",
        reviewed_by_admin_id: user.id, // replaced base44.auth.me()
        rejection_reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-verifications"] });
      toast.success("Document rejected");
    },
  });

  // Approve role
  const approveRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      return await base44.entities.UserRole.update(roleId, {
        approval_status: "approved",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-roles"] });
      toast.success("Role approved");
    },
  });

  // Reject role
  const rejectRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      return await base44.entities.UserRole.update(roleId, {
        approval_status: "rejected",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-roles"] });
      toast.success("Role rejected");
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-teal-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Verification Dashboard
            </h1>
            <p className="text-gray-600">
              Review documents and manage user approvals
            </p>
          </div>
        </div>

        <Tabs defaultValue="founding" className="space-y-6">
          <TabsList>
            <TabsTrigger value="founding" className="gap-2">
              <Star className="w-4 h-4" />
              Founding Members ({pendingFoundingMembers.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Pending Documents ({pendingDocs.length})
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <User className="w-4 h-4" />
              Pending Roles ({pendingRoles.length})
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              High Risk Users ({highRiskUsers.length})
            </TabsTrigger>
          </TabsList>

          {/* Founding Members */}
          <TabsContent value="founding">
            <div className="grid gap-4">
              {pendingFoundingMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            {member.full_name}
                          </span>
                          <Badge variant="outline" className="capitalize">
                            {member.role}
                          </Badge>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Pending Approval
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {member.email} • {member.postcode}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Signed up{" "}
                          {new Date(
                            member.signup_timestamp || member.created_date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            approveFoundingMemberMutation.mutate(member)
                          }
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve & Email
                        </Button>
                        <Button
                          onClick={() =>
                            rejectFoundingMemberMutation.mutate(member)
                          }
                          variant="destructive"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pendingFoundingMembers.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">
                      No pending founding member applications
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Pending Documents */}
          <TabsContent value="documents">
            <div className="grid gap-4">
              {pendingDocs.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <img
                          src={doc.file_url}
                          alt="Document"
                          className="w-32 h-32 object-cover rounded-lg border-2"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {doc.document_type.replace("_", " ")}
                            </Badge>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Pending
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            User ID: {doc.user_id}
                          </p>
                          <p className="text-xs text-gray-500">
                            Uploaded{" "}
                            {new Date(doc.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => approveDocMutation.mutate(doc.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() =>
                            rejectDocMutation.mutate({
                              docId: doc.id,
                              reason: "Document unclear",
                            })
                          }
                          variant="destructive"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pendingDocs.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No pending documents</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Pending Roles */}
          <TabsContent value="roles">
            <div className="grid gap-4">
              {pendingRoles.map((role) => (
                <Card key={role.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {role.role}
                          </Badge>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Pending Approval
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          User ID: {role.user_id}
                        </p>
                        <p className="text-xs text-gray-500">
                          Applied{" "}
                          {new Date(role.created_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => approveRoleMutation.mutate(role.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => rejectRoleMutation.mutate(role.id)}
                          variant="destructive"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pendingRoles.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No pending role approvals</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* High Risk Users */}
          <TabsContent value="risk">
            <div className="grid gap-4">
              {highRiskUsers.map((risk) => (
                <Card key={risk.id} className="border-red-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <Badge variant="destructive">High Risk</Badge>
                          <span className="text-lg font-semibold">
                            Score: {risk.score}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          User ID: {risk.user_id}
                        </p>
                        <p className="text-xs text-gray-500">
                          Last updated{" "}
                          {new Date(risk.last_updated).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline">View Events</Button>
                        <Button variant="destructive">
                          <Ban className="w-4 h-4 mr-2" />
                          Suspend
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {highRiskUsers.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No high risk users</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}