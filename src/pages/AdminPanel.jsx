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

  // Calibrated to match the UK_Map.jpg background image.
  // Image: 756×938px, aspect 1:1.241 (H = W * 1.241)
  // Projection: geoMercator approximating the image's Transverse Mercator.
  // Reference points: London (51.507N, -0.127W) → (0.688W, 0.768H)
  //                   Edinburgh (55.953N, -3.188W) → (0.545W, 0.499H)
  // To fine-tune: adjust MAP_SCALE (higher = zoom in).
  const MAP_SCALE_FACTOR = 2.6;  // pixels per radian, as multiple of container width
  const MAP_TX_FACTOR    = 0.535; // x translate as fraction of container width
  const MAP_TY_FACTOR    = 0.520; // y translate as fraction of container height

  const UK_MAP_IMG = "data:image/jpeg;base64,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";

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
    const W    = el.clientWidth  || 460;
    const H    = el.clientHeight || 571;

    d3.select(el).selectAll("*").remove();

    const svg = d3.select(el).append("svg")
      .attr("width", W).attr("height", H)
      .style("display", "block")
      .style("position", "absolute")
      .style("top", 0).style("left", 0);

    const proj = d3.geoMercator()
      .center([-3.5, 55.5])
      .scale(W * MAP_SCALE_FACTOR)
      .translate([W * MAP_TX_FACTOR, H * MAP_TY_FACTOR]);

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

        // Light outlines only — image provides the geography
        if (ireland) svg.append("path").datum(ireland)
          .attr("d", path)
          .attr("fill", "rgba(255,255,255,0.08)")
          .attr("stroke", "rgba(255,255,255,0.25)")
          .attr("stroke-width", "0.8");

        if (uk) svg.append("path").datum(uk)
          .attr("d", path)
          .attr("fill", "rgba(255,255,255,0.06)")
          .attr("stroke", "rgba(255,255,255,0.3)")
          .attr("stroke-width", "1");

        // Signup pins
        pins.forEach(p => {
          const c = proj([p.lng, p.lat]);
          if (!c || c[0]<0 || c[1]<0 || c[0]>W || c[1]>H) return;
          svg.append("circle")
            .attr("cx", c[0]).attr("cy", c[1]).attr("r", 3)
            .attr("fill", "#e11d48")
            .attr("fill-opacity", 0.85)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5);
        });

        // Sector bubbles
        sectorData.forEach(s => {
          if (!s.lat || !s.lng) return;
          const c = proj([s.lng, s.lat]);
          if (!c || c[0]<0 || c[1]<0 || c[0]>W || c[1]>H) return;
          const col = SECTOR_MAP_COLORS[s.computedStatus] || "#94a3b8";
          const g   = svg.append("g").style("cursor", "pointer");

          // Drop shadow for legibility over map
          g.append("circle")
            .attr("cx", c[0]+1).attr("cy", c[1]+1).attr("r", 11)
            .attr("fill", "rgba(0,0,0,0.25)")
            .attr("stroke", "none");

          g.append("circle")
            .attr("cx", c[0]).attr("cy", c[1]).attr("r", 10)
            .attr("fill", col)
            .attr("fill-opacity", s.computedStatus==="live" ? 1 : s.computedStatus==="phase3" ? 0.4 : 0.85)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

          // Sector number label inside bubble
          g.append("text")
            .attr("x", c[0]).attr("y", c[1])
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("font-size", "8")
            .attr("font-weight", "bold")
            .attr("fill", "#fff")
            .text(s.id);

          g.append("title").text(
            `${s.name}\nHosts: ${s.hosts}/${s.maxH} · Cleaners: ${s.cleaners}/${s.maxC}`
          );
        });
      })
      .catch(() => {
        svg.append("text").attr("x", W/2).attr("y", H/2)
          .attr("text-anchor", "middle").attr("font-size", "11")
          .attr("fill", "#fff").text("Map unavailable");
      });
  }, [ready, sectorData]);

  if (err) return <div className="flex items-center justify-center h-full text-xs text-white/50">Map failed to load</div>;
  if (!ready) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Map area — image background + SVG overlay */}
      <div ref={ref} className="flex-1 w-full min-h-0 relative overflow-hidden rounded-lg">
        {/* Background map image */}
        <img
          src={UK_MAP_IMG}
          alt="UK Map"
          className="absolute inset-0 w-full h-full object-cover"
          draggable="false"
        />
        {/* Subtle dark overlay to improve dot contrast */}
        <div className="absolute inset-0 bg-[#1E3A5F]/10 pointer-events-none" />
        {/* SVG rendered by the useEffect above — positioned absolute */}
      </div>

      {/* Legend */}
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

                {/* Map — 460px wide, height matches image aspect ratio 756:938 */}
                <div className="flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4" style={{ width:"460px", height:"615px" }}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Signup Map</p>
                  <div style={{ height:"calc(100% - 28px)" }}>
                    <UKMap sectorData={sectorData} />
                  </div>
                </div>

                {/* Sector table — height matches map, scrolls independently */}
                <div className="flex-1 min-w-0 overflow-y-auto" style={{ height:"615px" }}>
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