import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Shield, CheckCircle, XCircle, AlertTriangle, 
  User, FileText, Clock, Ban, Star
} from "lucide-react";
import { toast } from "sonner";
import { getUserRiskScore } from "@/components/utils/riskHelpers";

export default function AdminVerifications() {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { data: pendingDocs = [] } = useQuery({
    queryKey: ['pending-verifications'],
    queryFn: async () => {
      return await base44.entities.VerificationDocuments.filter({ verification_status: 'pending' }, '-created_date');
    }
  });

  const { data: pendingRoles = [] } = useQuery({
    queryKey: ['pending-roles'],
    queryFn: async () => {
      return await base44.entities.UserRole.filter({ approval_status: 'pending' }, '-created_date');
    }
  });

  const { data: highRiskUsers = [] } = useQuery({
    queryKey: ['high-risk-users'],
    queryFn: async () => {
      const scores = await base44.entities.RiskScores.filter({ risk_level: 'high' }, '-score');
      return scores;
    }
  });

  const { data: pendingFoundingMembers = [] } = useQuery({
    queryKey: ['pending-founding-members'],
    queryFn: async () => {
      return await base44.entities.FoundingMember.filter({ approval_status: 'pending' }, '-signup_timestamp');
    }
  });

  const approveFoundingMemberMutation = useMutation({
    mutationFn: async (member) => {
      await base44.entities.FoundingMember.update(member.id, { approval_status: 'approved' });
      const firstName = member.full_name.split(' ')[0];
      const tierText = member.role === 'host' ? 'Founding Host' : 'Founding Cleaner';
      await base44.integrations.Core.SendEmail({
        from_name: 'HostKeep Digital',
        to: member.email,
        subject: "You're confirmed — Welcome to HostKeep Digital 🌊",
        body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1E3A5F;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.5px;">HostKeep Digital</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;color:#333333;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;">Great news — your founding operator spot on <strong>HostKeep Digital</strong> has been confirmed.</p>
            <p style="margin:0 0 12px;">As a founding operator you have secured:</p>
            <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
              <tr><td style="padding:6px 0;color:#0F766E;width:20px;">&#8212;&nbsp;</td><td style="padding:6px 0;"><strong>Free access</strong> during the beta period — no payment until go-live</td></tr>
              <tr><td style="padding:6px 0;color:#0F766E;">&#8212;&nbsp;</td><td style="padding:6px 0;"><strong>0% commission</strong> on every booking, always</td></tr>
              <tr><td style="padding:6px 0;color:#0F766E;">&#8212;&nbsp;</td><td style="padding:6px 0;">Your <strong>locked founding rate</strong> — ${tierText} subscription</td></tr>
              <tr><td style="padding:6px 0;color:#0F766E;">&#8212;&nbsp;</td><td style="padding:6px 0;"><strong>Permanent founding operator badge</strong> on your profile</td></tr>
              <tr><td style="padding:6px 0;color:#0F766E;">&#8212;&nbsp;</td><td style="padding:6px 0;"><strong>Priority access</strong> to the CleanKeep marketplace</td></tr>
            </table>
            <p style="margin:0 0 16px;">We are launching in Cornwall in Summer 2026. We will be in touch as we get closer to launch with everything you need to get set up.</p>
            <p style="margin:0 0 24px;">Thank you for being part of this from the beginning.</p>
            <p style="margin:0 0 8px;">
              <a href="https://www.facebook.com/HostKeepDigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook" width="32" height="32" style="display:inline-block;" /></a>
              <a href="https://www.instagram.com/hostkeepdigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" width="32" height="32" style="display:inline-block;" /></a>
            </p>
            <p style="margin:0 0 4px;">The HostKeep Team</p>
            <p style="margin:0;color:#0F766E;">Hello@hostkeepdigital.co.uk</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eeeeee;padding:20px 40px;text-align:center;color:#999999;font-size:12px;line-height:1.8;">
            HostKeep Digital Ltd | You received this because you were confirmed as a founding operator.<br>
            <a href="#" style="color:#999999;">Unsubscribe</a><br><br>
            <a href="https://www.facebook.com/HostKeepDigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook" width="32" height="32" style="display:inline-block;" /></a>
            <a href="https://www.instagram.com/hostkeepdigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" width="32" height="32" style="display:inline-block;" /></a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-founding-members'] });
      toast.success('Founding member approved and confirmation email sent');
    }
  });

  const rejectFoundingMemberMutation = useMutation({
    mutationFn: async (member) => {
      // Check if spots are full for their role
      const allMembers = await base44.entities.FoundingMember.list();
      const cornwallMembers = allMembers.filter(m => m.approval_status !== 'out_of_area' && m.id !== member.id);
      const roleCount = cornwallMembers.filter(m => m.role === member.role && (m.approval_status === 'pending' || m.approval_status === 'approved')).length;
      const limit = member.role === 'host' ? 50 : 30;
      const isFull = roleCount >= limit;

      const newStatus = isFull ? 'waitlist' : 'rejected';
      await base44.entities.FoundingMember.update(member.id, { approval_status: newStatus });

      const firstName = member.full_name.split(' ')[0];

      if (isFull) {
        // Waitlist email
        await base44.integrations.Core.SendEmail({
          from_name: 'HostKeep Digital',
          to: member.email,
          subject: "You're on the waitlist — HostKeep Digital 🌊",
          body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1E3A5F;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.5px;">HostKeep Digital</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;color:#333333;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;">Thank you for applying to the <strong>HostKeep Digital Founding Operator Programme</strong>.</p>
            <p style="margin:0 0 16px;">Unfortunately our founding ${member.role} spots are now fully claimed. We have placed you on our waitlist and you will be first in line if a spot becomes available or when we expand capacity.</p>
            <p style="margin:0 0 24px;">We will be in touch as soon as something opens up.</p>
            <p style="margin:0 0 8px;">Follow us for updates:</p>
            <p style="margin:0 0 24px;">
              <a href="https://www.facebook.com/HostKeepDigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook" width="32" height="32" /></a>
              <a href="https://www.instagram.com/hostkeepdigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" width="32" height="32" /></a>
            </p>
            <p style="margin:0 0 4px;">The HostKeep Team</p>
            <p style="margin:0;color:#0F766E;">Hello@hostkeepdigital.co.uk</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eeeeee;padding:20px 40px;text-align:center;color:#999999;font-size:12px;line-height:1.8;">
            HostKeep Digital Ltd | You received this because you applied for a founding operator spot.<br>
            <a href="#" style="color:#999999;">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
        });
      } else {
        // Rejection email
        await base44.integrations.Core.SendEmail({
          from_name: 'HostKeep Digital',
          to: member.email,
          subject: "Your HostKeep Digital application — an update",
          body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1E3A5F;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.5px;">HostKeep Digital</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;color:#333333;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 16px;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;">Thank you for your interest in joining <strong>HostKeep Digital</strong> as a founding operator.</p>
            <p style="margin:0 0 16px;">After reviewing your application, we are unable to offer you a founding spot at this time. We appreciate you taking the time to apply and hope you will consider joining us when we open more widely.</p>
            <p style="margin:0 0 24px;">If you have any questions, please do not hesitate to get in touch.</p>
            <p style="margin:0 0 4px;">The HostKeep Team</p>
            <p style="margin:0;color:#0F766E;">Hello@hostkeepdigital.co.uk</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eeeeee;padding:20px 40px;text-align:center;color:#999999;font-size:12px;line-height:1.8;">
            HostKeep Digital Ltd | You received this because you applied for a founding operator spot.<br>
            <a href="#" style="color:#999999;">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-founding-members'] });
      toast.success('Founding member rejected and notified');
    }
  });

  const approveDocMutation = useMutation({
    mutationFn: async (docId) => {
      return await base44.entities.VerificationDocuments.update(docId, {
        verification_status: 'approved',
        reviewed_by_admin_id: (await base44.auth.me()).id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
      toast.success('Document approved');
    }
  });

  const rejectDocMutation = useMutation({
    mutationFn: async ({ docId, reason }) => {
      return await base44.entities.VerificationDocuments.update(docId, {
        verification_status: 'rejected',
        reviewed_by_admin_id: (await base44.auth.me()).id,
        rejection_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
      toast.success('Document rejected');
    }
  });

  const approveRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      return await base44.entities.UserRole.update(roleId, {
        approval_status: 'approved'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-roles'] });
      toast.success('Role approved');
    }
  });

  const rejectRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      return await base44.entities.UserRole.update(roleId, {
        approval_status: 'rejected'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-roles'] });
      toast.success('Role rejected');
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-teal-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Verification Dashboard</h1>
            <p className="text-gray-600">Review documents and manage user approvals</p>
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
                          <span className="font-semibold text-gray-900">{member.full_name}</span>
                          <Badge variant="outline" className="capitalize">{member.role}</Badge>
                          <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{member.email} &bull; {member.postcode}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Signed up {new Date(member.signup_timestamp || member.created_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => approveFoundingMemberMutation.mutate(member)}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={approveFoundingMemberMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve &amp; Email
                        </Button>
                        <Button
                          onClick={() => rejectFoundingMemberMutation.mutate(member.id)}
                          variant="destructive"
                          disabled={rejectFoundingMemberMutation.isPending}
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
                    <p className="text-gray-500">No pending founding member applications</p>
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
                            <Badge variant="outline">{doc.document_type.replace('_', ' ')}</Badge>
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">User ID: {doc.user_id}</p>
                          <p className="text-xs text-gray-500">
                            Uploaded {new Date(doc.created_date).toLocaleDateString()}
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
                          onClick={() => rejectDocMutation.mutate({ docId: doc.id, reason: 'Document unclear' })}
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
                          <Badge variant="outline" className="capitalize">{role.role}</Badge>
                          <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
                        </div>
                        <p className="text-sm text-gray-600">User ID: {role.user_id}</p>
                        <p className="text-xs text-gray-500">
                          Applied {new Date(role.created_date).toLocaleDateString()}
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
                          <span className="text-lg font-semibold">Score: {risk.score}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">User ID: {risk.user_id}</p>
                        <p className="text-xs text-gray-500">
                          Last updated {new Date(risk.last_updated).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline">
                          View Events
                        </Button>
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