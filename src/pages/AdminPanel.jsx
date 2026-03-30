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
  interest:                       "bg-gray-100 text-gray-600",
  pending:                        "bg-amber-100 text-amber-800",
  invited:                        "bg-blue-100 text-blue-800",
  password_protected:             "bg-indigo-100 text-indigo-700",
  awaiting_document_verification: "bg-purple-100 text-purple-700",
  documentation_failed_attempt_1: "bg-orange-100 text-orange-800",
  documentation_failed_attempt_2: "bg-red-100 text-red-700",
  approved:                       "bg-green-100 text-green-700",
  waitlist:                       "bg-orange-100 text-orange-700",
  rejected_pending_application:   "bg-yellow-100 text-yellow-800",
  rejected:                       "bg-red-100 text-red-600",
  out_of_area:                    "bg-gray-100 text-gray-500",
  banned_email_verification:      "bg-red-900 text-red-100",
  banned_documentation_failure:   "bg-red-900 text-red-100",
  banned_fraud:                   "bg-red-900 text-red-100",
  banned_manual_admin_action:     "bg-red-900 text-red-100",
};

const STATUS_LABELS = {
  interest:                       "Interest",
  pending:                        "Pending",
  invited:                        "Invited",
  password_protected:             "Password Protected",
  awaiting_document_verification: "Awaiting Docs",
  documentation_failed_attempt_1: "Doc Failed (1)",
  documentation_failed_attempt_2: "Doc Failed (2)",
  approved:                       "Approved",
  waitlist:                       "Waitlist",
  rejected_pending_application:   "Rejected — Second Chance",
  rejected:                       "Rejected",
  out_of_area:                    "Out of Area",
  banned_email_verification:      "Banned — Email",
  banned_documentation_failure:   "Banned — Docs",
  banned_fraud:                   "Banned — Fraud",
  banned_manual_admin_action:     "Banned — Manual",
};

const ACTIVE_STATUSES = new Set([
  "invited",
  "password_protected",
  "awaiting_document_verification",
  "documentation_failed_attempt_1",
  "documentation_failed_attempt_2",
  "rejected_pending_application",
]);

// ── UK SECTORS ───────────────────────────────────────────────────────────────

const SECTORS = [
  { id:"cornwall_devon",      name:"Cornwall & Devon",              postcodes:["TR","PL","EX"],                  maxH:20, maxC:10, lat:50.50, lng:-4.20, status:"live" },
  { id:"dorset_jurassic",     name:"Dorset & Jurassic Coast",       postcodes:["DT","BH"],                       maxH:20, maxC:10, lat:50.74, lng:-2.10, status:"waiting" },
  { id:"somerset_exmoor",     name:"Somerset & Exmoor",             postcodes:["TA"],                            maxH:20, maxC:10, lat:51.10, lng:-2.90, status:"waiting" },
  { id:"hampshire_iow",       name:"Hampshire & Isle of Wight",     postcodes:["SO","PO"],                       maxH:20, maxC:10, lat:50.85, lng:-1.30, status:"waiting" },
  { id:"sussex_kent",         name:"Sussex, Kent & Brighton",       postcodes:["BN","TN","CT","ME"],             maxH:20, maxC:10, lat:51.00, lng: 0.50, status:"waiting" },
  { id:"norfolk_suffolk",     name:"Norfolk & Suffolk Coast",       postcodes:["NR","IP"],                       maxH:20, maxC:10, lat:52.65, lng: 1.40, status:"waiting" },
  { id:"yorkshire_coast",     name:"Yorkshire Coast & Moors",       postcodes:["YO","HU","HG"],                  maxH:20, maxC:10, lat:54.25, lng:-0.50, status:"waiting" },
  { id:"lake_district",       name:"Lake District & Cumbria",       postcodes:["CA","LA"],                       maxH:20, maxC:10, lat:54.50, lng:-2.90, status:"waiting" },
  { id:"cotswolds",           name:"Cotswolds & Oxfordshire",       postcodes:["GL","OX","CV"],                  maxH:20, maxC:10, lat:51.85, lng:-1.60, status:"waiting" },
  { id:"north_wales",         name:"North Wales & Snowdonia",       postcodes:["LL","SY","CH"],                  maxH:20, maxC:10, lat:53.10, lng:-3.90, status:"waiting" },
  { id:"south_wales",         name:"South Wales & Pembrokeshire",   postcodes:["SA","NP"],                       maxH:20, maxC:10, lat:51.80, lng:-4.60, status:"waiting" },
  { id:"scottish_highlands",  name:"Scottish Highlands & Islands",  postcodes:["IV","PH","KW","PA"],             maxH:20, maxC:10, lat:57.50, lng:-4.50, status:"waiting" },
  { id:"northern_ireland",    name:"Northern Ireland & Causeway",   postcodes:["BT"],                            maxH:20, maxC:10, lat:54.90, lng:-6.40, status:"waiting" },
  { id:"bath_bristol",        name:"Bath, Bristol & Wells",         postcodes:["BA","BS"],                       maxH:20, maxC:10, lat:51.38, lng:-2.40, status:"waiting" },
  { id:"edinburgh",           name:"Edinburgh & Lothians",          postcodes:["EH","TD","KY"],                  maxH:20, maxC:10, lat:55.95, lng:-3.20, status:"waiting" },
  { id:"cardiff",             name:"Cardiff & Vale",                postcodes:["CF"],                            maxH:20, maxC:10, lat:51.48, lng:-3.18, status:"waiting" },
  { id:"york_harrogate",      name:"York & Harrogate",              postcodes:["YO1","HG"],                      maxH:20, maxC:10, lat:53.96, lng:-1.09, status:"waiting" },
  { id:"cambridge",           name:"Cambridge & Historic East",     postcodes:["CB","PE"],                       maxH:20, maxC:10, lat:52.20, lng: 0.12, status:"waiting" },
  { id:"liverpool",           name:"Liverpool & Merseyside",        postcodes:["L","CH","PR"],                   maxH:20, maxC:10, lat:53.40, lng:-2.98, status:"waiting" },
  { id:"london",              name:"London & Greater London",       postcodes:["E","N","W","SE","SW","EC","WC"], maxH:20, maxC:10, lat:51.50, lng:-0.12, status:"phase3" },
  { id:"manchester",          name:"Manchester & Salford",          postcodes:["M","BL","OL","SK"],              maxH:20, maxC:10, lat:53.48, lng:-2.24, status:"phase3" },
];

function getSectorId(postcode) {
  if (!postcode) return null;
  const clean = postcode.trim().toUpperCase();
  for (const s of SECTORS) {
    for (const p of s.postcodes) {
      if (clean.startsWith(p)) return s.id;
    }
  }
  return null;
}

// ── PLAN CONSTANTS ───────────────────────────────────────────────────────────

const PLAN_LABELS = {
  host_starter_monthly:   "Single Property Host",
  host_growth_monthly:    "Multi Property Host",
  host_pro_monthly:       "Portfolio Host",
  cleaner_solo_monthly:   "CleanKeep Solo Basic",
  cleaner_pro_monthly:    "CleanKeep Solo Pro",
  cleaner_team_monthly:   "CleanKeep Team",
  beta_host_access:       "Beta Host (Free)",
  beta_cleaner_access:    "Beta Cleaner (Free)",
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

const HOST_CAP    = 50;
const CLEANER_CAP = 30;

const SECTOR_MAP_COLORS = {
  live:     "#1E3A5F",
  ready:    "#0d9488",
  building: "#f59e0b",
  waiting:  "#94a3b8",
  phase3:   "#e2e8f0",
};

// ── UK MAP COMPONENT (inline) ─────────────────────────────────────────────────

function UKMap({ sectorData }) {
  const ref     = useRef(null);
  const [ready, setReady] = useState(false);
  const [err,   setErr  ] = useState(false);

  useEffect(() => {
    if (window.d3 && window.topojson) { setReady(true); return; }
    let s1, s2;
    s1 = document.createElement("script");
    s1.src = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js";
    s1.onload = () => {
      s2 = document.createElement("script");
      s2.src = "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js";
      s2.onload  = () => setReady(true);
      s2.onerror = () => setErr(true);
      document.head.appendChild(s2);
    };
    s1.onerror = () => setErr(true);
    document.head.appendChild(s1);
    return () => {
      if (s1?.parentNode) s1.parentNode.removeChild(s1);
      if (s2?.parentNode) s2.parentNode.removeChild(s2);
    };
  }, []);

  useEffect(() => {
    if (!ready || !ref.current || !sectorData?.length) return;
    const d3   = window.d3;
    const topo = window.topojson;
    const el   = ref.current;
    const W    = el.clientWidth  || 280;
    const H    = el.clientHeight || 520;

    d3.select(el).selectAll("*").remove();

    const svg = d3.select(el).append("svg")
      .attr("width", W).attr("height", H)
      .style("display", "block");

    const proj = d3.geoMercator()
      .center([-3.8, 55.0])
      .scale(W * 5.6)
      .translate([W * 0.52, H * 0.49]);

    const path = d3.geoPath().projection(proj);

    // Signup pins
    const pins = sectorData.flatMap(s =>
      Array.from({ length: Math.max(1, Math.floor((s.hosts + s.cleaners) * 0.55)) }, () => ({
        lat: s.lat + (Math.random() - 0.5) * 0.9,
        lng: s.lng + (Math.random() - 0.5) * 1.3,
      }))
    );

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json")
      .then(world => {
        const features = topo.feature(world, world.objects.countries).features;
        const uk      = features.find(f => f.id === 826);
        const ireland = features.find(f => f.id === 372);

        if (ireland) svg.append("path").datum(ireland)
          .attr("d", path).attr("fill", "#f1f5f9")
          .attr("stroke", "#e2e8f0").attr("stroke-width", "0.5");

        if (uk) svg.append("path").datum(uk)
          .attr("d", path).attr("fill", "#dde4ec")
          .attr("stroke", "#94a3b8").attr("stroke-width", "0.8");

        // Signup pins
        pins.forEach(p => {
          const c = proj([p.lng, p.lat]);
          if (!c || c[0]<0 || c[1]<0 || c[0]>W || c[1]>H) return;
          svg.append("circle")
            .attr("cx", c[0]).attr("cy", c[1]).attr("r", 2)
            .attr("fill", "#e11d48").attr("fill-opacity", 0.6)
            .attr("stroke", "none");
        });

        // Sector bubbles
        sectorData.forEach(s => {
          if (!s.lat || !s.lng) return;
          const c = proj([s.lng, s.lat]);
          if (!c || c[0]<0 || c[1]<0 || c[0]>W || c[1]>H) return;
          const col = SECTOR_MAP_COLORS[s.computedStatus] || "#94a3b8";
          const g   = svg.append("g").style("cursor", "pointer");
          g.append("circle")
            .attr("cx", c[0]).attr("cy", c[1]).attr("r", 9)
            .attr("fill", col)
            .attr("fill-opacity", s.computedStatus==="live" ? 1 : s.computedStatus==="phase3" ? 0.3 : 0.75)
            .attr("stroke", "#fff").attr("stroke-width", 1.5);
          g.append("title").text(
            `${s.name}\nHosts: ${s.hosts}/${s.maxH} · Cleaners: ${s.cleaners}/${s.maxC}`
          );
        });
      })
      .catch(() => {
        svg.append("text").attr("x", W/2).attr("y", H/2)
          .attr("text-anchor", "middle").attr("font-size", "11")
          .attr("fill", "#9ca3af").text("Map unavailable");
      });
  }, [ready, sectorData]);

  if (err) return <div className="flex items-center justify-center h-full text-xs text-gray-300">Map failed to load</div>;
  if (!ready) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-[#1E3A5F] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div ref={ref} className="flex-1 w-full min-h-0" />
      <div className="flex flex-wrap gap-3 pt-2 mt-2 border-t border-gray-100">
        {[
          { c:"#1E3A5F", l:"Live" },
          { c:"#0d9488", l:"Ready" },
          { c:"#f59e0b", l:"Building" },
          { c:"#94a3b8", l:"Waiting" },
          { c:"#e11d48", l:"Signup" },
        ].map(({ c, l }) => (
          <span key={l} className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("onboarding");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [members,       setMembers      ] = useState([]);
  const [loading,       setLoading      ] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);
  const [crmLoading,    setCrmLoading   ] = useState(true);

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

  useEffect(() => { fetchMembers(); fetchSubscriptions(); }, []);

  const setML = (id, val) => setActionLoading(p => ({ ...p, [id]: val }));

  // ── ONBOARDING HANDLERS ───────────────────────────────────────────────────

  const handleApprove = async (member) => {
    setML(member.id, "approve");
    try {
      await base44.functions.invoke("promoteUserToInvited", { member_id: member.id });
      toast.success(`${member.full_name} approved — invite email sent`);
    } catch (e) {
      toast.error("Approval failed");
      console.error(e);
    }
    setML(member.id, null);
    fetchMembers();
  };

  const handleWaitlist = async (member) => {
    setML(member.id, "waitlist");
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
    setML(member.id, null);
    fetchMembers();
  };

  const handleReject = async (member) => {
    setML(member.id, "reject");
    const note = window.prompt(`Rejection reason for ${member.full_name}:`);
    if (!note?.trim()) { setML(member.id, null); return; }
    await base44.entities.FoundingMember.update(member.id, { approval_status: "rejected" });
    await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "Your HostKeep Application",
      html: buildEmail({
        heading: "Your HostKeep Application",
        body: `Thank you for applying to join HostKeep.<br><br>After reviewing your application, we are unable to approve it at this time.<br><br><strong>Reason:</strong><br>${note.trim()}<br><br>If you have questions, contact <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;">hello@hostkeepdigital.co.uk</a>.`,
      }),
    });
    toast.success(`${member.full_name} rejected`);
    setML(member.id, null);
    fetchMembers();
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.full_name}? This cannot be undone.`)) return;
    setML(member.id, "delete");
    await base44.entities.FoundingMember.delete(member.id);
    toast.success("Record deleted");
    setML(member.id, null);
    fetchMembers();
  };

  // ── VERIFICATION QUERIES ──────────────────────────────────────────────────

  const { data: pendingDocs   = [] } = useQuery({ queryKey:["pending-verifications"], queryFn: () => base44.entities.VerificationDocuments.filter({ verification_status:"pending" }, "-created_date") });
  const { data: pendingRoles  = [] } = useQuery({ queryKey:["pending-roles"],         queryFn: () => base44.entities.UserRole.filter({ approval_status:"pending" }, "-created_date") });
  const { data: highRiskUsers = [] } = useQuery({ queryKey:["high-risk-users"],       queryFn: () => base44.entities.RiskScores.filter({ risk_level:"high" }, "-score") });

  const approveDocMutation = useMutation({
    mutationFn: (id) => base44.entities.VerificationDocuments.update(id, { verification_status:"approved", reviewed_by_admin_id: user?.email }),
    onSuccess: () => { queryClient.invalidateQueries(["pending-verifications"]); toast.success("Document approved"); },
  });
  const rejectDocMutation = useMutation({
    mutationFn: ({ id, reason }) => base44.entities.VerificationDocuments.update(id, { verification_status:"rejected", reviewed_by_admin_id: user?.email, rejection_reason: reason }),
    onSuccess: () => { queryClient.invalidateQueries(["pending-verifications"]); toast.success("Document rejected"); },
  });
  const approveRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.UserRole.update(id, { approval_status:"approved" }),
    onSuccess: () => { queryClient.invalidateQueries(["pending-roles"]); toast.success("Role approved"); },
  });
  const rejectRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.UserRole.update(id, { approval_status:"rejected" }),
    onSuccess: () => { queryClient.invalidateQueries(["pending-roles"]); toast.success("Role rejected"); },
  });

  // ── FILTERS ───────────────────────────────────────────────────────────────

  const byStatus = (s) => members.filter(m => m.approval_status === s);
  const interestMembers          = byStatus("interest");
  const pendingMembers           = byStatus("pending");
  const invitedMembers           = byStatus("invited");
  const passwordProtectedMembers = byStatus("password_protected");
  const awaitingDocMembers       = byStatus("awaiting_document_verification");
  const docFail1Members          = byStatus("documentation_failed_attempt_1");
  const docFail2Members          = byStatus("documentation_failed_attempt_2");
  const approvedMembers          = byStatus("approved");
  const waitlistMembers          = byStatus("waitlist");
  const rejectedPendingMembers   = byStatus("rejected_pending_application");
  const rejectedMembers          = byStatus("rejected");
  const outOfAreaMembers         = byStatus("out_of_area");
  const bannedEmailMembers       = byStatus("banned_email_verification");
  const bannedDocMembers         = byStatus("banned_documentation_failure");
  const bannedFraudMembers       = byStatus("banned_fraud");
  const bannedManualMembers      = byStatus("banned_manual_admin_action");

  const activeHosts    = members.filter(m => m.role === "host"    && ACTIVE_STATUSES.has(m.approval_status)).length;
  const activeCleaners = members.filter(m => m.role === "cleaner" && ACTIVE_STATUSES.has(m.approval_status)).length;

  // ── CRM CALCS ─────────────────────────────────────────────────────────────

  const activeSubs    = subscriptions.filter(s => s.status === "active");
  const cancelledSubs = subscriptions.filter(s => s.status === "cancelled");
  const mrr           = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? s.price_monthly ?? 0), 0);
  const lostRevenue   = cancelledSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? s.price_monthly ?? 0), 0);
  const hostMrr       = activeSubs.filter(s => PLAN_TYPE[s.plan]==="host").reduce((sum,s)=>sum+(PLAN_PRICES[s.plan]??s.price_monthly??0),0);
  const cleanerMrr    = activeSubs.filter(s => PLAN_TYPE[s.plan]==="cleaner").reduce((sum,s)=>sum+(PLAN_PRICES[s.plan]??s.price_monthly??0),0);
  const planBreakdown = activeSubs.reduce((acc, s) => {
    const k = s.plan || "unknown";
    if (!acc[k]) acc[k] = { count:0, revenue:0 };
    acc[k].count++;
    acc[k].revenue += PLAN_PRICES[k] ?? s.price_monthly ?? 0;
    return acc;
  }, {});

  // ── SECTOR CALCS ──────────────────────────────────────────────────────────

  const sectorData = SECTORS.map(sector => {
    const sm       = members.filter(m => getSectorId(m.postcode) === sector.id);
    const hosts    = sm.filter(m => m.role === "host").length;
    const cleaners = sm.filter(m => m.role === "cleaner").length;
    const computed = sector.status === "live" ? "live"
                   : sector.status === "phase3" ? "phase3"
                   : (hosts >= sector.maxH && cleaners >= sector.maxC) ? "ready"
                   : (hosts > 0 || cleaners > 0) ? "building"
                   : "waiting";
    return { ...sector, hosts, cleaners, computedStatus: computed };
  });

  // ── UI HELPERS ────────────────────────────────────────────────────────────

  const MemberTable = ({ members: rows, showActions = false }) => (
    <div className="max-h-[220px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["Full Name","Email","Role","Postcode","Status","Signed Up", showActions ? "Actions" : null]
              .filter(Boolean).map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(m => (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{m.full_name}</td>
              <td className="px-4 py-3 text-gray-500">{m.email}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.role==="host" ? "bg-teal-50 text-teal-700" : "bg-purple-50 text-purple-700"}`}>
                  {m.role==="host" ? "Host" : "Cleaner"}
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
                      {actionLoading[m.id]==="approve" ? "..." : <><Check className="w-3 h-3 mr-1"/>Approve</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" disabled={!!actionLoading[m.id]} onClick={() => handleWaitlist(m)}>
                      {actionLoading[m.id]==="waitlist" ? "..." : "Waitlist"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-red-300 text-red-600 hover:bg-red-50" disabled={!!actionLoading[m.id]} onClick={() => handleReject(m)}>
                      {actionLoading[m.id]==="reject" ? "..." : <><X className="w-3 h-3 mr-1"/>Reject</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-gray-200 text-gray-400 hover:bg-gray-50" disabled={!!actionLoading[m.id]} onClick={() => handleDelete(m)}>
                      {actionLoading[m.id]==="delete" ? "..." : "Delete"}
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

  const Section = ({ title, count, children, accent="gray" }) => {
    const dots = { gray:"bg-gray-300", amber:"bg-amber-400", blue:"bg-blue-400", indigo:"bg-indigo-400", purple:"bg-purple-400", green:"bg-green-500", orange:"bg-orange-400", red:"bg-red-500", yellow:"bg-yellow-400", rose:"bg-rose-600" };
    return (
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dots[accent]||dots.gray}`} />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
          <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>
        </div>
        {children}
      </section>
    );
  };

  const MetricCard = ({ icon: Icon, label, value, sub, color="teal" }) => {
    const c = { teal:{bg:"bg-teal-50",icon:"text-teal-600",val:"text-teal-700"}, navy:{bg:"bg-blue-50",icon:"text-[#1E3A5F]",val:"text-[#1E3A5F]"}, green:{bg:"bg-green-50",icon:"text-green-600",val:"text-green-700"}, red:{bg:"bg-red-50",icon:"text-red-500",val:"text-red-600"}, purple:{bg:"bg-purple-50",icon:"text-purple-600",val:"text-purple-700"} }[color] || {};
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

  const SectorBadge = ({ status }) => {
    const m = { live:{bg:"bg-[#1E3A5F]",t:"text-white",l:"Live"}, ready:{bg:"bg-teal-100",t:"text-teal-800",l:"Ready to Open"}, building:{bg:"bg-amber-100",t:"text-amber-800",l:"Building"}, waiting:{bg:"bg-gray-100",t:"text-gray-500",l:"Waiting"}, phase3:{bg:"bg-slate-100",t:"text-slate-500",l:"Phase 3"} }[status] || {bg:"bg-gray-100",t:"text-gray-500",l:status};
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.bg} ${m.t}`}>{m.l}</span>;
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

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
            <RefreshCw className={`w-3.5 h-3.5 ${(loading||crmLoading) ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex border-t border-gray-100">
          {[
            { id:"onboarding", label:"Onboarding",   Icon:Users    },
            { id:"crm",        label:"CRM & Revenue", Icon:BarChart2 },
            { id:"sectors",    label:"UK Sectors",    Icon:Globe    },
          ].map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab===id ? "border-[#0d9488] text-[#0d9488]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ONBOARDING ─────────────────────────────────────────────────────── */}
      {activeTab === "onboarding" && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="text-center py-20 text-gray-300 text-sm">Loading members...</div>
          ) : (
            <div className="space-y-8">

              {/* Capacity counters */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label:"Active Host Applications",     count:activeHosts,    cap:HOST_CAP,    color:"#1E3A5F" },
                  { label:"Active Cleaner Applications",  count:activeCleaners, cap:CLEANER_CAP, color:"#0d9488" },
                ].map(({ label, count, cap, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <div className="flex items-end gap-3">
                      <p className="text-3xl font-bold" style={{ color }}>{count}</p>
                      <p className="text-sm text-gray-400 mb-1">/ {cap} cap</p>
                    </div>
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(100,(count/cap)*100)}%`, background:color }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">{cap-count} spots remaining</p>
                  </div>
                ))}
              </div>

              {/* Pipeline */}
              <Section title="Interest / Sign-Ups"            count={interestMembers.length}          accent="gray">   <MemberTable members={interestMembers}          showActions /></Section>
              <Section title="Pending Applications"           count={pendingMembers.length}           accent="amber">  <MemberTable members={pendingMembers}           showActions /></Section>
              <Section title="Invited"                        count={invitedMembers.length}           accent="blue">   <MemberTable members={invitedMembers}           showActions /></Section>
              <Section title="Password Protected"             count={passwordProtectedMembers.length} accent="indigo"> <MemberTable members={passwordProtectedMembers} showActions /></Section>
              <Section title="Awaiting Document Verification" count={awaitingDocMembers.length}       accent="purple"> <MemberTable members={awaitingDocMembers}       showActions /></Section>
              <Section title="Doc Failed — Attempt 1"         count={docFail1Members.length}          accent="orange"> <MemberTable members={docFail1Members}          showActions /></Section>
              <Section title="Doc Failed — Attempt 2"         count={docFail2Members.length}          accent="red">    <MemberTable members={docFail2Members}          showActions /></Section>

              {/* Pending document queue */}
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
                          <Badge variant="outline" className="text-xs mb-1">{(doc.document_type||"").replace(/_/g," ")}</Badge>
                          <p className="text-xs text-gray-500">User: {doc.user_id}</p>
                          <p className="text-xs text-gray-400">Uploaded {new Date(doc.created_date).toLocaleDateString("en-GB")}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => approveDocMutation.mutate(doc.id)}><CheckCircle className="w-3 h-3 mr-1"/>Approve</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600" onClick={() => rejectDocMutation.mutate({ id:doc.id, reason:"Document unclear or unacceptable" })}><X className="w-3 h-3 mr-1"/>Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <Section title="Approved"                  count={approvedMembers.length}        accent="green">  <MemberTable members={approvedMembers}        showActions /></Section>
              <Section title="Waitlist"                  count={waitlistMembers.length}        accent="orange"> <MemberTable members={waitlistMembers}        showActions /></Section>
              <Section title="Rejected — Second Chance" count={rejectedPendingMembers.length}  accent="yellow"> <MemberTable members={rejectedPendingMembers}  showActions /></Section>
              <Section title="Rejected (Final)"          count={rejectedMembers.length}        accent="red">    <MemberTable members={rejectedMembers}        showActions /></Section>
              <Section title="Out of Area"               count={outOfAreaMembers.length}       accent="gray">   <MemberTable members={outOfAreaMembers}       showActions /></Section>

              {/* Banned */}
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

              {/* Pending roles */}
              {pendingRoles.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pending Role Approvals</h2>
                    <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{pendingRoles.length}</span>
                  </div>
                  <div className="space-y-3">
                    {pendingRoles.map(r => (
                      <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="capitalize text-xs mb-1">{r.role}</Badge>
                          <p className="text-xs text-gray-500">User: {r.user_id}</p>
                          <p className="text-xs text-gray-400">Applied {new Date(r.created_date).toLocaleDateString("en-GB")}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => approveRoleMutation.mutate(r.id)}><CheckCircle className="w-3 h-3 mr-1"/>Approve</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600" onClick={() => rejectRoleMutation.mutate(r.id)}><X className="w-3 h-3 mr-1"/>Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* High risk */}
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
                            <p className="text-xs text-gray-500">User: {risk.user_id}</p>
                            <p className="text-xs text-gray-400">{new Date(risk.last_updated).toLocaleDateString("en-GB")}</p>
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

      {/* ── CRM ────────────────────────────────────────────────────────────── */}
      {activeTab === "crm" && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {crmLoading ? (
            <div className="text-center py-20 text-gray-300 text-sm">Loading revenue data...</div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard icon={PoundSterling} label="Monthly Recurring Revenue" value={`£${mrr.toFixed(2)}`}         sub="All active subscriptions"                                                                                                            color="teal"   />
                <MetricCard icon={TrendingUp}    label="Annual Projection"          value={`£${(mrr*12).toFixed(0)}`}    sub="Based on current MRR"                                                                                                                 color="navy"   />
                <MetricCard icon={Users}         label="Active Subscribers"         value={activeSubs.length}            sub={`${activeSubs.filter(s=>PLAN_TYPE[s.plan]==="host").length} hosts · ${activeSubs.filter(s=>PLAN_TYPE[s.plan]==="cleaner").length} cleaners`} color="green"  />
                <MetricCard icon={XCircle}       label="Cancelled"                  value={cancelledSubs.length}         sub={`£${lostRevenue.toFixed(2)}/mo lost`}                                                                                                 color="red"    />
                <MetricCard icon={BarChart2}     label="Host / Cleaner MRR"         value={`£${hostMrr.toFixed(2)}`}     sub={`Hosts · Cleaners £${cleanerMrr.toFixed(2)}`}                                                                                         color="purple" />
              </div>

              {/* Plan breakdown */}
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
                        {["Plan","Type","Subscribers","Monthly Revenue","% of MRR"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(planBreakdown).sort((a,b)=>b[1].revenue-a[1].revenue).map(([plan,data]) => (
                        <tr key={plan} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{PLAN_LABELS[plan]||plan}</td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_TYPE[plan]==="host"?"bg-teal-50 text-teal-700":"bg-purple-50 text-purple-700"}`}>{PLAN_TYPE[plan]==="host"?"Host":"Cleaner"}</span></td>
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
                      {!Object.keys(planBreakdown).length && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-300 text-sm">No active subscriptions yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cancelled */}
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
                          <td className="px-4 py-3 font-medium text-gray-900">{PLAN_LABELS[s.plan]||s.plan||"—"}</td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_TYPE[s.plan]==="host"?"bg-teal-50 text-teal-700":"bg-purple-50 text-purple-700"}`}>{PLAN_TYPE[s.plan]==="host"?"Host":"Cleaner"}</span></td>
                          <td className="px-4 py-3 text-gray-700">£{(PLAN_PRICES[s.plan]??s.price_monthly??0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{s.end_date ? new Date(s.end_date).toLocaleDateString("en-GB") : s.updated_date ? new Date(s.updated_date).toLocaleDateString("en-GB") : "—"}</td>
                        </tr>
                      ))}
                      {!cancelledSubs.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-300 text-sm">No cancelled subscriptions</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UK SECTORS ─────────────────────────────────────────────────────── */}
      {activeTab === "sectors" && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="text-center py-20 text-gray-300 text-sm">Loading sector data...</div>
          ) : (
            <div className="space-y-6">

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { l:"Live Sectors",   v:sectorData.filter(s=>s.computedStatus==="live").length,     c:"text-[#1E3A5F]" },
                  { l:"Ready to Open", v:sectorData.filter(s=>s.computedStatus==="ready").length,    c:"text-teal-600" },
                  { l:"Building",      v:sectorData.filter(s=>s.computedStatus==="building").length, c:"text-amber-600" },
                  { l:"Waiting",       v:sectorData.filter(s=>s.computedStatus==="waiting"||s.computedStatus==="phase3").length, c:"text-gray-400" },
                ].map(s => (
                  <div key={s.l} className="bg-white rounded-xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-400 mb-0.5">{s.l}</p>
                    <p className={`text-3xl font-bold ${s.c}`}>{s.v}</p>
                  </div>
                ))}
              </div>

              {/* Threshold note */}
              <div className="bg-[#1E3A5F]/5 border border-[#1E3A5F]/10 rounded-xl px-5 py-3 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#1E3A5F] flex-shrink-0" />
                <p className="text-sm text-[#1E3A5F]">
                  Unlock threshold: <strong>20 registered hosts</strong> + <strong>10 registered cleaners</strong> per sector (+25% buffer for activation drop-off)
                </p>
              </div>

              {/* Map + Table side by side */}
              <div className="flex gap-6 items-start">

                {/* Map */}
                <div className="flex-shrink-0 w-72 bg-white rounded-xl border border-gray-200 p-4" style={{ height:"580px" }}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex-shrink-0">Signup Map</p>
                  <div style={{ height:"calc(100% - 28px)" }}>
                    <UKMap sectorData={sectorData} />
                  </div>
                </div>

                {/* Sector table */}
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          {["Sector","Hosts","Cleaners","Status","Action"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sectorData.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 text-xs">{s.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{s.postcodes.slice(0,4).join(", ")}{s.postcodes.length>4?"…":""}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#1E3A5F] rounded-full" style={{ width:`${Math.min(100,(s.hosts/s.maxH)*100)}%` }} />
                                </div>
                                <span className="text-xs text-gray-600">{s.hosts}/{s.maxH}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#0d9488] rounded-full" style={{ width:`${Math.min(100,(s.cleaners/s.maxC)*100)}%` }} />
                                </div>
                                <span className="text-xs text-gray-600">{s.cleaners}/{s.maxC}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3"><SectorBadge status={s.computedStatus} /></td>
                            <td className="px-4 py-3">
                              {s.computedStatus === "ready" ? (
                                <Button size="sm" className="h-7 px-3 text-xs bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={() => toast.info("Open Sector — backend function coming soon")}>
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

                  {/* Out of area grouped */}
                  {outOfAreaMembers.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Out of Area — By Sector</h2>
                        <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{outOfAreaMembers.length}</span>
                      </div>
                      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                        {SECTORS.map(sector => {
                          const sm       = outOfAreaMembers.filter(m => getSectorId(m.postcode) === sector.id);
                          if (!sm.length) return null;
                          const hosts    = sm.filter(m=>m.role==="host").length;
                          const cleaners = sm.filter(m=>m.role==="cleaner").length;
                          return (
                            <div key={sector.id} className="bg-white rounded-xl border border-gray-200 p-4">
                              <p className="text-sm font-medium text-gray-900 mb-1">{sector.name}</p>
                              <div className="flex gap-4 text-xs text-gray-500">
                                <span><span className="font-semibold text-[#1E3A5F]">{hosts}</span> host{hosts!==1?"s":""}</span>
                                <span><span className="font-semibold text-[#0d9488]">{cleaners}</span> cleaner{cleaners!==1?"s":""}</span>
                              </div>
                            </div>
                          );
                        }).filter(Boolean)}
                        {(() => {
                          const unknown = outOfAreaMembers.filter(m => !getSectorId(m.postcode));
                          return unknown.length ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <p className="text-sm font-medium text-gray-400 mb-1">Unknown postcodes</p>
                              <p className="text-xs text-gray-400">{unknown.length} member{unknown.length!==1?"s":""}</p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
