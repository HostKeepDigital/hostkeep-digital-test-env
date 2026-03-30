import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildEmail } from "@/lib/emailTemplate";
import {
  Shield, Check, X, RefreshCw, TrendingUp, Users, PoundSterling,
  XCircle, BarChart2, FileText, AlertTriangle, Ban, Star,
  CheckCircle, Clock, MapPin, Globe
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

// ── STATUS MAPS ──────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  interest:                      "bg-gray-100 text-gray-600",
  pending:                       "bg-amber-100 text-amber-800",
  invited:                       "bg-blue-100 text-blue-800",
  password_protected:            "bg-indigo-100 text-indigo-700",
  awaiting_document_verification:"bg-purple-100 text-purple-700",
  documentation_failed_attempt_1:"bg-orange-100 text-orange-800",
  documentation_failed_attempt_2:"bg-red-100 text-red-700",
  approved:                      "bg-green-100 text-green-700",
  waitlist:                      "bg-orange-100 text-orange-700",
  rejected_pending_application:  "bg-yellow-100 text-yellow-800",
  rejected:                      "bg-red-100 text-red-600",
  out_of_area:                   "bg-gray-100 text-gray-500",
  banned_email_verification:     "bg-red-900 text-red-100",
  banned_documentation_failure:  "bg-red-900 text-red-100",
  banned_fraud:                  "bg-red-900 text-red-100",
  banned_manual_admin_action:    "bg-red-900 text-red-100",
};

const STATUS_LABELS = {
  interest:                      "Interest",
  pending:                       "Pending",
  invited:                       "Invited",
  password_protected:            "Password Protected",
  awaiting_document_verification:"Awaiting Docs",
  documentation_failed_attempt_1:"Doc Failed (1)",
  documentation_failed_attempt_2:"Doc Failed (2)",
  approved:                      "Approved",
  waitlist:                      "Waitlist",
  rejected_pending_application:  "Rejected — Second Chance",
  rejected:                      "Rejected",
  out_of_area:                   "Out of Area",
  banned_email_verification:     "Banned — Email",
  banned_documentation_failure:  "Banned — Docs",
  banned_fraud:                  "Banned — Fraud",
  banned_manual_admin_action:    "Banned — Manual",
};

// Statuses that count toward the active application cap
const ACTIVE_STATUSES = new Set([
  "invited",
  "password_protected",
  "awaiting_document_verification",
  "documentation_failed_attempt_1",
  "documentation_failed_attempt_2",
  "rejected_pending_application",
]);

// ── UK SECTOR MAPPING ────────────────────────────────────────────────────────

const SECTORS = [
  { id:"cornwall_devon",      name:"Cornwall & Devon",              postcodes:["TR","PL","EX"],             maxH:20, maxC:10, status:"live" },
  { id:"dorset_jurassic",     name:"Dorset & Jurassic Coast",       postcodes:["DT","BH"],                  maxH:20, maxC:10, status:"waiting" },
  { id:"somerset_exmoor",     name:"Somerset & Exmoor",             postcodes:["TA"],                       maxH:20, maxC:10, status:"waiting" },
  { id:"hampshire_iow",       name:"Hampshire & Isle of Wight",     postcodes:["SO","PO"],                  maxH:20, maxC:10, status:"waiting" },
  { id:"sussex_kent",         name:"Sussex, Kent & Brighton",       postcodes:["BN","TN","CT","ME"],        maxH:20, maxC:10, status:"waiting" },
  { id:"norfolk_suffolk",     name:"Norfolk & Suffolk Coast",       postcodes:["NR","IP"],                  maxH:20, maxC:10, status:"waiting" },
  { id:"yorkshire_coast",     name:"Yorkshire Coast & Moors",       postcodes:["YO","HU","HG"],             maxH:20, maxC:10, status:"waiting" },
  { id:"lake_district",       name:"Lake District & Cumbria",       postcodes:["CA","LA"],                  maxH:20, maxC:10, status:"waiting" },
  { id:"cotswolds",           name:"Cotswolds & Oxfordshire",       postcodes:["GL","OX","CV"],             maxH:20, maxC:10, status:"waiting" },
  { id:"north_wales",         name:"North Wales & Snowdonia",       postcodes:["LL","SY","CH"],             maxH:20, maxC:10, status:"waiting" },
  { id:"south_wales",         name:"South Wales & Pembrokeshire",   postcodes:["SA","NP"],                  maxH:20, maxC:10, status:"waiting" },
  { id:"scottish_highlands",  name:"Scottish Highlands & Islands",  postcodes:["IV","PH","KW","PA"],        maxH:20, maxC:10, status:"waiting" },
  { id:"northern_ireland",    name:"Northern Ireland & Causeway",   postcodes:["BT"],                       maxH:20, maxC:10, status:"waiting" },
  { id:"bath_bristol",        name:"Bath, Bristol & Wells",         postcodes:["BA","BS"],                  maxH:20, maxC:10, status:"waiting" },
  { id:"edinburgh",           name:"Edinburgh & Lothians",          postcodes:["EH","TD","KY"],             maxH:20, maxC:10, status:"waiting" },
  { id:"cardiff",             name:"Cardiff & Vale",                postcodes:["CF"],                       maxH:20, maxC:10, status:"waiting" },
  { id:"york_harrogate",      name:"York & Harrogate",              postcodes:["YO1","HG"],                 maxH:20, maxC:10, status:"waiting" },
  { id:"cambridge",           name:"Cambridge & Historic East",     postcodes:["CB","PE"],                  maxH:20, maxC:10, status:"waiting" },
  { id:"liverpool",           name:"Liverpool & Merseyside",        postcodes:["L","CH","PR"],              maxH:20, maxC:10, status:"waiting" },
  { id:"london",              name:"London & Greater London",       postcodes:["E","N","W","SE","SW","EC","WC"], maxH:20, maxC:10, status:"phase3" },
  { id:"manchester",          name:"Manchester & Salford",          postcodes:["M","BL","OL","SK"],         maxH:20, maxC:10, status:"phase3" },
];

function getSectorId(postcode) {
  if (!postcode) return null;
  const clean = postcode.trim().toUpperCase();
  // Try longest prefix first (e.g. YO1 before YO)
  for (const sector of SECTORS) {
    for (const prefix of sector.postcodes) {
      if (clean.startsWith(prefix)) return sector.id;
    }
  }
  return null;
}

// ── PLAN CONSTANTS (CRM) ─────────────────────────────────────────────────────

const PLAN_LABELS = {
  host_starter_monthly:    "Single Property Host",
  host_growth_monthly:     "Multi Property Host",
  host_pro_monthly:        "Portfolio Host",
  cleaner_solo_monthly:    "CleanKeep Solo Basic",
  cleaner_pro_monthly:     "CleanKeep Solo Pro",
  cleaner_team_monthly:    "CleanKeep Team",
  beta_host_access:        "Beta Host (Free)",
  beta_cleaner_access:     "Beta Cleaner (Free)",
};

const PLAN_PRICES = {
  host_starter_monthly:  29,
  host_growth_monthly:   59,
  host_pro_monthly:      99,
  cleaner_solo_monthly:  9.99,
  cleaner_pro_monthly:   19.99,
  cleaner_team_monthly:  39.99,
  beta_host_access:      0,
  beta_cleaner_access:   0,
};

const PLAN_TYPE = {
  host_starter_monthly:  "host",
  host_growth_monthly:   "host",
  host_pro_monthly:      "host",
  cleaner_solo_monthly:  "cleaner",
  cleaner_pro_monthly:   "cleaner",
  cleaner_team_monthly:  "cleaner",
  beta_host_access:      "host",
  beta_cleaner_access:   "cleaner",
};

// ── PHASE CAPS ───────────────────────────────────────────────────────────────
const HOST_CAP    = 50;
const CLEANER_CAP = 30;

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("onboarding");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── ONBOARDING STATE ──────────────────────────────────────────────────────
  const [members, setMembers]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  // ── CRM STATE ────────────────────────────────────────────────────────────
  const [subscriptions, setSubscriptions] = useState([]);
  const [crmLoading, setCrmLoading]       = useState(true);

  const fetchMembers = async () => {
    setLoading(true);
    const data = await base44.entities.FoundingMember.list("-signup_timestamp", 500);
    setMembers(data || []);
    setLoading(false);
  };

  const fetchSubscriptions = async () => {
    setCrmLoading(true);
    try {
      const data = await base44.entities.Subscription.list("-created_date", 500);
      setSubscriptions(data || []);
    } catch { setSubscriptions([]); }
    setCrmLoading(false);
  };

  useEffect(() => {
    fetchMembers();
    fetchSubscriptions();
  }, []);

  const setMemberLoading = (id, val) => setActionLoading(p => ({ ...p, [id]: val }));

  // ── ONBOARDING HANDLERS ───────────────────────────────────────────────────

  const handleApprove = async (member) => {
    setMemberLoading(member.id, "approve");
    try {
      await base44.functions.invoke("promoteUserToInvited", { member_id: member.id });
      toast.success(`${member.full_name} approved — invite email sent`);
    } catch (e) {
      toast.error("Approval failed");
      console.error(e);
    }
    setMemberLoading(member.id, null);
    fetchMembers();
  };

  const handleWaitlist = async (member) => {
    setMemberLoading(member.id, "waitlist");
    await base44.entities.FoundingMember.update(member.id, { approval_status: "waitlist" });
    await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "HostKeep — You're on our waitlist",
      html: buildEmail({
        heading: "You're on our waitlist",
        body: `Thank you for applying to join HostKeep.<br><br>Our founding spots are currently full, but we've added you to our waitlist.<br><br>You'll be among the first to know when a spot opens up.`,
      }),
    });
    toast.success(`${member.full_name} moved to waitlist`);
    setMemberLoading(member.id, null);
    fetchMembers();
  };

  const handleReject = async (member) => {
    setMemberLoading(member.id, "reject");
    const note = window.prompt(`Rejection reason for ${member.full_name}:`);
    if (!note || !note.trim()) { setMemberLoading(member.id, null); return; }

    await base44.entities.FoundingMember.update(member.id, { approval_status: "rejected" });
    await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "Your HostKeep Application",
      html: buildEmail({
        heading: "Your HostKeep Application",
        body: `Thank you for applying to join HostKeep.<br><br>After reviewing your application, we are unable to approve it at this time.<br><br><strong>Reason:</strong><br>${note.trim()}<br><br>If you have questions, contact us at <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;">hello@hostkeepdigital.co.uk</a>.`,
      }),
    });
    toast.success(`${member.full_name} rejected`);
    setMemberLoading(member.id, null);
    fetchMembers();
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.full_name}? This cannot be undone.`)) return;
    setMemberLoading(member.id, "delete");
    await base44.entities.FoundingMember.delete(member.id);
    toast.success("Record deleted");
    setMemberLoading(member.id, null);
    fetchMembers();
  };

  // ── VERIFICATION QUERIES (from AdminVerifications) ────────────────────────

  const { data: pendingDocs = [] } = useQuery({
    queryKey: ["pending-verifications"],
    queryFn: () => base44.entities.VerificationDocuments.filter({ verification_status: "pending" }, "-created_date"),
  });

  const { data: pendingRoles = [] } = useQuery({
    queryKey: ["pending-roles"],
    queryFn: () => base44.entities.UserRole.filter({ approval_status: "pending" }, "-created_date"),
  });

  const { data: highRiskUsers = [] } = useQuery({
    queryKey: ["high-risk-users"],
    queryFn: () => base44.entities.RiskScores.filter({ risk_level: "high" }, "-score"),
  });

  const approveDocMutation = useMutation({
    mutationFn: (docId) => base44.entities.VerificationDocuments.update(docId, {
      verification_status: "approved", reviewed_by_admin_id: user?.email,
    }),
    onSuccess: () => { queryClient.invalidateQueries(["pending-verifications"]); toast.success("Document approved"); },
  });

  const rejectDocMutation = useMutation({
    mutationFn: ({ docId, reason }) => base44.entities.VerificationDocuments.update(docId, {
      verification_status: "rejected", reviewed_by_admin_id: user?.email, rejection_reason: reason,
    }),
    onSuccess: () => { queryClient.invalidateQueries(["pending-verifications"]); toast.success("Document rejected"); },
  });

  const approveRoleMutation = useMutation({
    mutationFn: (roleId) => base44.entities.UserRole.update(roleId, { approval_status: "approved" }),
    onSuccess: () => { queryClient.invalidateQueries(["pending-roles"]); toast.success("Role approved"); },
  });

  const rejectRoleMutation = useMutation({
    mutationFn: (roleId) => base44.entities.UserRole.update(roleId, { approval_status: "rejected" }),
    onSuccess: () => { queryClient.invalidateQueries(["pending-roles"]); toast.success("Role rejected"); },
  });

  // ── MEMBER FILTERS ────────────────────────────────────────────────────────

  const byStatus = (s) => members.filter(m => m.approval_status === s);

  const interestMembers           = byStatus("interest");
  const pendingMembers            = byStatus("pending");
  const invitedMembers            = byStatus("invited");
  const passwordProtectedMembers  = byStatus("password_protected");
  const awaitingDocMembers        = byStatus("awaiting_document_verification");
  const docFail1Members           = byStatus("documentation_failed_attempt_1");
  const docFail2Members           = byStatus("documentation_failed_attempt_2");
  const approvedMembers           = byStatus("approved");
  const waitlistMembers           = byStatus("waitlist");
  const rejectedPendingMembers    = byStatus("rejected_pending_application");
  const rejectedMembers           = byStatus("rejected");
  const outOfAreaMembers          = byStatus("out_of_area");
  const bannedEmailMembers        = byStatus("banned_email_verification");
  const bannedDocMembers          = byStatus("banned_documentation_failure");
  const bannedFraudMembers        = byStatus("banned_fraud");
  const bannedManualMembers       = byStatus("banned_manual_admin_action");

  // Active application counts (toward cap)
  const activeHosts    = members.filter(m => m.role === "host"    && ACTIVE_STATUSES.has(m.approval_status)).length;
  const activeCleaners = members.filter(m => m.role === "cleaner" && ACTIVE_STATUSES.has(m.approval_status)).length;

  // ── CRM CALCULATIONS ──────────────────────────────────────────────────────

  const activeSubs    = subscriptions.filter(s => s.status === "active");
  const cancelledSubs = subscriptions.filter(s => s.status === "cancelled");
  const mrr           = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? s.price_monthly ?? 0), 0);
  const lostRevenue   = cancelledSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? s.price_monthly ?? 0), 0);
  const hostMrr       = activeSubs.filter(s => PLAN_TYPE[s.plan] === "host").reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? s.price_monthly ?? 0), 0);
  const cleanerMrr    = activeSubs.filter(s => PLAN_TYPE[s.plan] === "cleaner").reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? s.price_monthly ?? 0), 0);

  const planBreakdown = activeSubs.reduce((acc, s) => {
    const k = s.plan || "unknown";
    if (!acc[k]) acc[k] = { count: 0, revenue: 0 };
    acc[k].count    += 1;
    acc[k].revenue  += PLAN_PRICES[k] ?? s.price_monthly ?? 0;
    return acc;
  }, {});

  // ── UK SECTOR CALCULATIONS ────────────────────────────────────────────────

  const sectorData = SECTORS.map(sector => {
    const sectorMembers = members.filter(m => getSectorId(m.postcode) === sector.id);
    const hosts    = sectorMembers.filter(m => m.role === "host").length;
    const cleaners = sectorMembers.filter(m => m.role === "cleaner").length;
    const ready    = hosts >= sector.maxH && cleaners >= sector.maxC;
    const status   = sector.status === "live" ? "live"
                   : sector.status === "phase3" ? "phase3"
                   : ready ? "ready"
                   : (hosts > 0 || cleaners > 0) ? "building"
                   : "waiting";
    return { ...sector, hosts, cleaners, ready, computedStatus: status };
  });

  // ── SHARED UI COMPONENTS ──────────────────────────────────────────────────

  const MemberTable = ({ members: rows, showActions = false }) => (
    <div className="max-h-[220px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["Full Name","Email","Role","Postcode","Status","Signed Up", showActions ? "Actions" : null]
              .filter(Boolean).map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(m => (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{m.full_name}</td>
              <td className="px-4 py-3 text-gray-500">{m.email}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.role === "host" ? "bg-teal-50 text-teal-700" : "bg-purple-50 text-purple-700"}`}>
                  {m.role === "host" ? "Host" : "Cleaner"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 uppercase tracking-wide text-xs">{m.postcode}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[m.approval_status] || "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[m.approval_status] || m.approval_status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {m.signup_timestamp ? new Date(m.signup_timestamp).toLocaleDateString("en-GB") : "—"}
              </td>
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button size="sm" className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white" disabled={!!actionLoading[m.id]} onClick={() => handleApprove(m)}>
                      {actionLoading[m.id] === "approve" ? "..." : <><Check className="w-3 h-3 mr-1" />Approve</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" disabled={!!actionLoading[m.id]} onClick={() => handleWaitlist(m)}>
                      {actionLoading[m.id] === "waitlist" ? "..." : "Waitlist"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-red-300 text-red-600 hover:bg-red-50" disabled={!!actionLoading[m.id]} onClick={() => handleReject(m)}>
                      {actionLoading[m.id] === "reject" ? "..." : <><X className="w-3 h-3 mr-1" />Reject</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-gray-200 text-gray-400 hover:bg-gray-50" disabled={!!actionLoading[m.id]} onClick={() => handleDelete(m)}>
                      {actionLoading[m.id] === "delete" ? "..." : "Delete"}
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={showActions ? 7 : 6} className="px-4 py-8 text-center text-gray-300 text-sm">No records in this section</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const Section = ({ title, count, children, accent = "gray" }) => {
    const dotColors = { gray:"bg-gray-300", amber:"bg-amber-400", blue:"bg-blue-400", indigo:"bg-indigo-400", purple:"bg-purple-400", green:"bg-green-500", orange:"bg-orange-400", red:"bg-red-500", yellow:"bg-yellow-400", rose:"bg-rose-600" };
    return (
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[accent] || dotColors.gray}`} />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
          <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>
        </div>
        {children}
      </section>
    );
  };

  const MetricCard = ({ icon: Icon, label, value, sub, color = "teal" }) => {
    const c = {
      teal:   { bg:"bg-teal-50",   icon:"text-teal-600",   val:"text-teal-700" },
      navy:   { bg:"bg-blue-50",   icon:"text-[#1E3A5F]",  val:"text-[#1E3A5F]" },
      green:  { bg:"bg-green-50",  icon:"text-green-600",  val:"text-green-700" },
      red:    { bg:"bg-red-50",    icon:"text-red-500",    val:"text-red-600" },
      purple: { bg:"bg-purple-50", icon:"text-purple-600", val:"text-purple-700" },
    }[color] || { bg:"bg-teal-50", icon:"text-teal-600", val:"text-teal-700" };
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
          <p className={`text-2xl font-bold leading-tight ${c.val}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    );
  };

  const SectorStatusBadge = ({ status }) => {
    const map = {
      live:     { bg:"bg-[#1E3A5F]",  text:"text-white",         label:"Live" },
      ready:    { bg:"bg-teal-100",    text:"text-teal-800",       label:"Ready to Open" },
      building: { bg:"bg-amber-100",   text:"text-amber-800",      label:"Building" },
      waiting:  { bg:"bg-gray-100",    text:"text-gray-500",       label:"Waiting" },
      phase3:   { bg:"bg-slate-100",   text:"text-slate-500",      label:"Phase 3" },
    };
    const s = map[status] || map.waiting;
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  const TABS = [
    { id:"onboarding",  label:"Onboarding",   icon:Users },
    { id:"crm",         label:"CRM & Revenue", icon:BarChart2 },
    { id:"sectors",     label:"UK Sectors",    icon:Globe },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1E3A5F] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Admin Panel</h1>
              <p className="text-xs text-gray-400">HostKeep Digital Ltd</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchMembers(); fetchSubscriptions(); }} disabled={loading || crmLoading} className="gap-2 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || crmLoading) ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Tab nav */}
        <div className="max-w-7xl mx-auto px-6 flex border-t border-gray-100">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-[#0d9488] text-[#0d9488]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ONBOARDING TAB ─────────────────────────────────────────────────── */}
      {activeTab === "onboarding" && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="text-center py-20 text-gray-300 text-sm">Loading members...</div>
          ) : (
            <div className="space-y-8">

              {/* Active application counter */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-400 mb-1">Active Host Applications</p>
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-bold text-[#1E3A5F]">{activeHosts}</p>
                    <p className="text-sm text-gray-400 mb-1">/ {HOST_CAP} cap</p>
                  </div>
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1E3A5F] rounded-full transition-all" style={{ width: `${Math.min(100,(activeHosts/HOST_CAP)*100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{HOST_CAP - activeHosts} spots remaining</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-400 mb-1">Active Cleaner Applications</p>
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-bold text-[#0d9488]">{activeCleaners}</p>
                    <p className="text-sm text-gray-400 mb-1">/ {CLEANER_CAP} cap</p>
                  </div>
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0d9488] rounded-full transition-all" style={{ width: `${Math.min(100,(activeCleaners/CLEANER_CAP)*100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{CLEANER_CAP - activeCleaners} spots remaining</p>
                </div>
              </div>

              {/* ── PIPELINE SECTIONS ── */}
              <Section title="Interest / Sign-Ups"              count={interestMembers.length}          accent="gray">   <MemberTable members={interestMembers}          showActions /></Section>
              <Section title="Pending Applications"             count={pendingMembers.length}           accent="amber">  <MemberTable members={pendingMembers}           showActions /></Section>
              <Section title="Invited"                          count={invitedMembers.length}           accent="blue">   <MemberTable members={invitedMembers}           showActions /></Section>
              <Section title="Password Protected"               count={passwordProtectedMembers.length} accent="indigo"> <MemberTable members={passwordProtectedMembers} showActions /></Section>
              <Section title="Awaiting Document Verification"   count={awaitingDocMembers.length}       accent="purple"> <MemberTable members={awaitingDocMembers}       showActions /></Section>

              {/* Document verification queue */}
              {(pendingDocs.length > 0 || docFail1Members.length > 0 || docFail2Members.length > 0) && (
                <>
                  <Section title="Doc Failed — Attempt 1" count={docFail1Members.length} accent="orange"><MemberTable members={docFail1Members} showActions /></Section>
                  <Section title="Doc Failed — Attempt 2" count={docFail2Members.length} accent="red">   <MemberTable members={docFail2Members} showActions /></Section>

                  {pendingDocs.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pending Documents</h2>
                        <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{pendingDocs.length}</span>
                      </div>
                      <div className="space-y-3">
                        {pendingDocs.map(doc => (
                          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
                            <img src={doc.file_url} alt="Document" className="w-20 h-20 object-cover rounded-lg border flex-shrink-0" />
                            <div className="flex-1">
                              <Badge variant="outline" className="text-xs mb-1">{(doc.document_type||"").replace("_"," ")}</Badge>
                              <p className="text-xs text-gray-500">User ID: {doc.user_id}</p>
                              <p className="text-xs text-gray-400">Uploaded {new Date(doc.created_date).toLocaleDateString("en-GB")}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => approveDocMutation.mutate(doc.id)}><CheckCircle className="w-3 h-3 mr-1"/>Approve</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600" onClick={() => rejectDocMutation.mutate({ docId: doc.id, reason: "Document unclear or unacceptable" })}><X className="w-3 h-3 mr-1"/>Reject</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              <Section title="Approved"                      count={approvedMembers.length}       accent="green">  <MemberTable members={approvedMembers}       showActions /></Section>
              <Section title="Waitlist"                      count={waitlistMembers.length}       accent="orange"> <MemberTable members={waitlistMembers}       showActions /></Section>
              <Section title="Rejected — Second Chance"     count={rejectedPendingMembers.length} accent="yellow"> <MemberTable members={rejectedPendingMembers} showActions /></Section>
              <Section title="Rejected (Final)"             count={rejectedMembers.length}       accent="red">    <MemberTable members={rejectedMembers}       showActions /></Section>
              <Section title="Out of Area"                  count={outOfAreaMembers.length}      accent="gray">   <MemberTable members={outOfAreaMembers}      showActions /></Section>

              {/* Banned sections */}
              {(bannedEmailMembers.length + bannedDocMembers.length + bannedFraudMembers.length + bannedManualMembers.length) > 0 && (
                <>
                  <div className="border-t border-red-100 pt-6">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-4">Banned accounts</p>
                  </div>
                  {bannedEmailMembers.length  > 0 && <Section title="Banned — Email Verification"  count={bannedEmailMembers.length}  accent="rose"><MemberTable members={bannedEmailMembers}  /></Section>}
                  {bannedDocMembers.length    > 0 && <Section title="Banned — Documentation"       count={bannedDocMembers.length}    accent="rose"><MemberTable members={bannedDocMembers}    /></Section>}
                  {bannedFraudMembers.length  > 0 && <Section title="Banned — Fraud"               count={bannedFraudMembers.length}  accent="rose"><MemberTable members={bannedFraudMembers}  /></Section>}
                  {bannedManualMembers.length > 0 && <Section title="Banned — Manual Admin Action" count={bannedManualMembers.length} accent="rose"><MemberTable members={bannedManualMembers} /></Section>}
                </>
              )}

              {/* Pending roles & risk */}
              {pendingRoles.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pending Role Approvals</h2>
                    <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{pendingRoles.length}</span>
                  </div>
                  <div className="space-y-3">
                    {pendingRoles.map(role => (
                      <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="capitalize text-xs mb-1">{role.role}</Badge>
                          <p className="text-xs text-gray-500">User ID: {role.user_id}</p>
                          <p className="text-xs text-gray-400">Applied {new Date(role.created_date).toLocaleDateString("en-GB")}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => approveRoleMutation.mutate(role.id)}><CheckCircle className="w-3 h-3 mr-1"/>Approve</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600" onClick={() => rejectRoleMutation.mutate(role.id)}><X className="w-3 h-3 mr-1"/>Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {highRiskUsers.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">High Risk Users</h2>
                    <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{highRiskUsers.length}</span>
                  </div>
                  <div className="space-y-3">
                    {highRiskUsers.map(risk => (
                      <div key={risk.id} className="bg-white rounded-xl border border-red-200 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Score: {risk.score}</p>
                            <p className="text-xs text-gray-500">User ID: {risk.user_id}</p>
                            <p className="text-xs text-gray-400">Updated {new Date(risk.last_updated).toLocaleDateString("en-GB")}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="destructive" className="h-7 text-xs"><Ban className="w-3 h-3 mr-1"/>Suspend</Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}
        </div>
      )}

      {/* ── CRM TAB ────────────────────────────────────────────────────────── */}
      {activeTab === "crm" && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {crmLoading ? (
            <div className="text-center py-20 text-gray-300 text-sm">Loading revenue data...</div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard icon={PoundSterling} label="Monthly Recurring Revenue" value={`£${mrr.toFixed(2)}`}              sub="All active subscriptions"                       color="teal" />
                <MetricCard icon={TrendingUp}    label="Annual Projection"          value={`£${(mrr*12).toFixed(0)}`}         sub="Based on current MRR"                          color="navy" />
                <MetricCard icon={Users}         label="Active Subscribers"         value={activeSubs.length}                 sub={`${activeSubs.filter(s=>PLAN_TYPE[s.plan]==="host").length} hosts · ${activeSubs.filter(s=>PLAN_TYPE[s.plan]==="cleaner").length} cleaners`} color="green" />
                <MetricCard icon={XCircle}       label="Cancelled"                  value={cancelledSubs.length}              sub={`£${lostRevenue.toFixed(2)}/mo lost`}           color="red" />
                <MetricCard icon={BarChart2}     label="Host / Cleaner MRR"         value={`£${hostMrr.toFixed(2)}`}          sub={`Hosts · Cleaners £${cleanerMrr.toFixed(2)}`}   color="purple" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Active Subscriptions by Plan</h2>
                  <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{activeSubs.length}</span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {["Plan","Type","Subscribers","Monthly Revenue","% of MRR"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(planBreakdown).sort((a,b)=>b[1].revenue-a[1].revenue).map(([plan,data]) => (
                        <tr key={plan} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{PLAN_LABELS[plan] || plan}</td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_TYPE[plan]==="host" ? "bg-teal-50 text-teal-700" : "bg-purple-50 text-purple-700"}`}>{PLAN_TYPE[plan]==="host"?"Host":"Cleaner"}</span></td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{data.count}</td>
                          <td className="px-4 py-3 text-gray-900 font-semibold">£{data.revenue.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                                <div className="bg-[#0d9488] h-1.5 rounded-full" style={{ width: mrr>0 ? `${(data.revenue/mrr)*100}%` : "0%" }} />
                              </div>
                              <span className="text-xs text-gray-500">{mrr>0 ? `${((data.revenue/mrr)*100).toFixed(0)}%` : "—"}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {Object.keys(planBreakdown).length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-300 text-sm">No active subscriptions yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cancelled Subscriptions</h2>
                  <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{cancelledSubs.length}</span>
                  {cancelledSubs.length > 0 && <span className="ml-2 text-xs text-red-500 font-medium">£{lostRevenue.toFixed(2)}/mo lost</span>}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {["User ID","Plan","Type","Monthly Value","Cancelled"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cancelledSubs.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.user_id?.slice(0,12)}...</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{PLAN_LABELS[s.plan] || s.plan || "—"}</td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_TYPE[s.plan]==="host" ? "bg-teal-50 text-teal-700" : "bg-purple-50 text-purple-700"}`}>{PLAN_TYPE[s.plan]==="host"?"Host":"Cleaner"}</span></td>
                          <td className="px-4 py-3 text-gray-700">£{(PLAN_PRICES[s.plan] ?? s.price_monthly ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{s.end_date ? new Date(s.end_date).toLocaleDateString("en-GB") : s.updated_date ? new Date(s.updated_date).toLocaleDateString("en-GB") : "—"}</td>
                        </tr>
                      ))}
                      {cancelledSubs.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-300 text-sm">No cancelled subscriptions</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UK SECTORS TAB ─────────────────────────────────────────────────── */}
      {activeTab === "sectors" && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="text-center py-20 text-gray-300 text-sm">Loading sector data...</div>
          ) : (
            <div className="space-y-6">

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label:"Live Sectors",    value: sectorData.filter(s=>s.computedStatus==="live").length,     color:"text-[#1E3A5F]" },
                  { label:"Ready to Open",   value: sectorData.filter(s=>s.computedStatus==="ready").length,    color:"text-teal-600" },
                  { label:"Building",        value: sectorData.filter(s=>s.computedStatus==="building").length, color:"text-amber-600" },
                  { label:"Waiting",         value: sectorData.filter(s=>s.computedStatus==="waiting"||s.computedStatus==="phase3").length, color:"text-gray-400" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Threshold reminder */}
              <div className="bg-[#1E3A5F]/5 border border-[#1E3A5F]/10 rounded-xl px-5 py-3 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#1E3A5F] flex-shrink-0" />
                <p className="text-sm text-[#1E3A5F]">
                  Unlock threshold: <strong>20 registered hosts</strong> + <strong>10 registered cleaners</strong> per sector (+25% buffer for activation drop-off)
                </p>
              </div>

              {/* Sector table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Sector","Postcodes","Hosts","Cleaners","Status","Action"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sectorData.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{s.postcodes.slice(0,4).join(", ")}{s.postcodes.length > 4 ? "…" : ""}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#1E3A5F] rounded-full" style={{ width: `${Math.min(100,(s.hosts/s.maxH)*100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{s.hosts}/{s.maxH}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#0d9488] rounded-full" style={{ width: `${Math.min(100,(s.cleaners/s.maxC)*100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{s.cleaners}/{s.maxC}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><SectorStatusBadge status={s.computedStatus} /></td>
                        <td className="px-4 py-3">
                          {s.computedStatus === "ready" ? (
                            <Button size="sm" className="h-7 px-3 text-xs bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={() => toast.info("Open Sector backend function coming soon — see build spec")}>
                              Open Sector
                            </Button>
                          ) : s.computedStatus === "live" ? (
                            <span className="text-xs text-[#1E3A5F] font-medium">Live ✓</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Out-of-area members grouped by sector */}
              {outOfAreaMembers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Out of Area — By Sector</h2>
                    <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{outOfAreaMembers.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SECTORS.map(sector => {
                      const sMembers = outOfAreaMembers.filter(m => getSectorId(m.postcode) === sector.id);
                      if (sMembers.length === 0) return null;
                      const hosts    = sMembers.filter(m => m.role === "host").length;
                      const cleaners = sMembers.filter(m => m.role === "cleaner").length;
                      return (
                        <div key={sector.id} className="bg-white rounded-xl border border-gray-200 p-4">
                          <p className="text-sm font-medium text-gray-900 mb-1">{sector.name}</p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span><span className="font-semibold text-[#1E3A5F]">{hosts}</span> host{hosts !== 1 ? "s" : ""}</span>
                            <span><span className="font-semibold text-[#0d9488]">{cleaners}</span> cleaner{cleaners !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                    {/* Unknown/unmatched */}
                    {(() => {
                      const unknown = outOfAreaMembers.filter(m => !getSectorId(m.postcode));
                      if (unknown.length === 0) return null;
                      return (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <p className="text-sm font-medium text-gray-400 mb-1">Unknown postcodes</p>
                          <p className="text-xs text-gray-400">{unknown.length} member{unknown.length !== 1 ? "s" : ""}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
