import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildEmail } from "@/lib/emailTemplate";
import {
  Shield, Check, X, RefreshCw, TrendingUp, Users, PoundSterling,
  XCircle, BarChart2, FileText, AlertTriangle, Ban, Star,
  CheckCircle, Clock, MapPin, Globe, Settings,
  Eye, UserPlus, LogIn, Percent, ShoppingBag, Calendar
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SiteVisitorWidget from "@/components/admin/SiteVisitorWidget";
import DevToolsSection from "@/components/admin/DevToolsSection";
import { useAuth } from "@/lib/AuthContext";
import ComplaintsTab from "@/components/admin/ComplaintsTab";
import SectorsTab from "@/components/admin/SectorsTab";
import SmartPricingTab from "@/components/admin/SmartPricingTab";
import DocMemberTable from "@/components/admin/DocMemberTable";
import GateChecklist from "@/components/admin/GateChecklist";
import IntegrationTestsTab from "@/components/admin/IntegrationTestsTab";


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
  banned:                         "bg-red-900 text-red-100",
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
  banned:                         "Banned",
};

const ACTIVE_STATUSES = new Set([
  "invited",
  "password_protected",
  "awaiting_document_verification",
  "documentation_failed_attempt_1",
  "documentation_failed_attempt_2",
  "rejected_pending_application",
]);

// ── UK SECTORS (full UK coverage) ───────────────────────────────────────────

const SECTORS = [
  // ── South West England ───────────────────────────────────────────────────
  { id:"cornwall",        name:"Cornwall & Isles of Scilly",         postcodes:["TR"],                                      maxH:20, maxC:10, lat:50.26, lng:-5.05, status:"live"    },
  { id:"devon",           name:"Devon & Torbay",                     postcodes:["PL","EX","TQ"],                           maxH:20, maxC:10, lat:50.73, lng:-3.85, status:"waiting" },
  { id:"dorset",          name:"Dorset & Jurassic Coast",            postcodes:["DT","BH"],                                maxH:20, maxC:10, lat:50.75, lng:-2.20, status:"waiting" },
  { id:"somerset",        name:"Somerset & Exmoor",                  postcodes:["TA"],                                     maxH:20, maxC:10, lat:51.10, lng:-3.10, status:"waiting" },
  { id:"bristol",         name:"Bristol, Bath & Wiltshire",          postcodes:["BS","BA","SN","SP"],                      maxH:20, maxC:10, lat:51.45, lng:-2.60, status:"waiting" },
  // ── South East England ───────────────────────────────────────────────────
  { id:"hampshire",       name:"Hampshire & Isle of Wight",          postcodes:["SO","PO"],                                maxH:20, maxC:10, lat:50.90, lng:-1.40, status:"waiting" },
  { id:"sussex_kent",     name:"Sussex, Kent & East Surrey",         postcodes:["BN","TN","CT","ME","DA","RH"],           maxH:20, maxC:10, lat:51.10, lng: 0.55, status:"waiting" },
  { id:"surrey_berks",    name:"Surrey, Berkshire & Thames Valley",  postcodes:["GU","KT","RG","SL","TW","SM","CR","BR"], maxH:20, maxC:10, lat:51.38, lng:-0.75, status:"waiting" },
  { id:"london",          name:"Greater London",                     postcodes:["EC","WC","WD","SE","SW","NW","E","N","W","HA","UB","IG","RM","EN"], maxH:30, maxC:15, lat:51.51, lng:-0.12, status:"phase3"  },
  { id:"essex_herts",     name:"Essex & Hertfordshire",              postcodes:["CM","CO","SS","SG","AL","LU","HP"],       maxH:20, maxC:10, lat:51.76, lng: 0.22, status:"waiting" },
  { id:"oxfordshire",     name:"Oxfordshire & Buckinghamshire",      postcodes:["OX","MK"],                               maxH:20, maxC:10, lat:51.82, lng:-1.20, status:"waiting" },
  { id:"cotswolds",       name:"Cotswolds & Gloucestershire",        postcodes:["GL","HR","WR"],                          maxH:20, maxC:10, lat:51.85, lng:-1.90, status:"waiting" },
  // ── East of England ─────────────────────────────────────────────────────
  { id:"norfolk_suffolk", name:"Norfolk & Suffolk Coast",            postcodes:["NR","IP"],                               maxH:20, maxC:10, lat:52.63, lng: 1.30, status:"waiting" },
  { id:"cambridge",       name:"Cambridge & The Fens",               postcodes:["CB","PE"],                               maxH:20, maxC:10, lat:52.20, lng: 0.12, status:"waiting" },
  { id:"lincolnshire",    name:"Lincolnshire Coast & Wolds",         postcodes:["LN","DN"],                               maxH:20, maxC:10, lat:53.22, lng:-0.54, status:"waiting" },
  // ── Midlands ────────────────────────────────────────────────────────────
  { id:"east_midlands",   name:"East Midlands",                      postcodes:["LE","NN","NG","DE","CV"],                maxH:20, maxC:10, lat:52.64, lng:-1.13, status:"waiting" },
  { id:"west_midlands",   name:"West Midlands & Black Country",      postcodes:["B","WV","WS","DY","ST","TF"],            maxH:20, maxC:10, lat:52.49, lng:-1.90, status:"phase3"  },
  { id:"shropshire",      name:"Shropshire & Welsh Borders",         postcodes:["SY","WR"],                               maxH:20, maxC:10, lat:52.71, lng:-2.76, status:"waiting" },
  // ── North West England ───────────────────────────────────────────────────
  { id:"cheshire",        name:"Cheshire & Peak District",           postcodes:["CW","CH","SK","WA"],                     maxH:20, maxC:10, lat:53.19, lng:-2.50, status:"waiting" },
  { id:"manchester",      name:"Greater Manchester & Merseyside",    postcodes:["M","BL","OL","WN","L"],                  maxH:20, maxC:10, lat:53.48, lng:-2.55, status:"phase3"  },
  { id:"lancashire",      name:"Lancashire & Fylde Coast",           postcodes:["PR","FY","BB"],                          maxH:20, maxC:10, lat:53.83, lng:-2.60, status:"waiting" },
  { id:"cumbria",         name:"Cumbria & Lake District",            postcodes:["CA","LA"],                               maxH:20, maxC:10, lat:54.55, lng:-3.00, status:"waiting" },
  // ── Yorkshire & North East ───────────────────────────────────────────────
  { id:"yorkshire",       name:"Yorkshire (Leeds, York & Dales)",    postcodes:["LS","BD","HX","WF","HG","HD","S","HU"], maxH:20, maxC:10, lat:53.80, lng:-1.55, status:"waiting" },
  { id:"north_yorkshire", name:"North Yorkshire Moors & Coast",      postcodes:["YO","DL"],                               maxH:20, maxC:10, lat:54.30, lng:-0.55, status:"waiting" },
  { id:"north_east",      name:"North East England",                 postcodes:["NE","DH","SR","TS"],                     maxH:20, maxC:10, lat:54.97, lng:-1.62, status:"waiting" },
  // ── Wales ───────────────────────────────────────────────────────────────
  { id:"north_wales",     name:"North Wales & Snowdonia",            postcodes:["LL"],                                    maxH:20, maxC:10, lat:53.10, lng:-3.85, status:"waiting" },
  { id:"mid_wales",       name:"Mid Wales & Ceredigion",             postcodes:["LD"],                                    maxH:20, maxC:10, lat:52.36, lng:-3.62, status:"waiting" },
  { id:"pembrokeshire",   name:"Pembrokeshire & West Wales",         postcodes:["SA"],                                    maxH:20, maxC:10, lat:51.85, lng:-4.70, status:"waiting" },
  { id:"south_wales",     name:"South Wales, Cardiff & Newport",     postcodes:["CF","NP"],                               maxH:20, maxC:10, lat:51.50, lng:-3.18, status:"waiting" },
  // ── Scotland ────────────────────────────────────────────────────────────
  { id:"scottish_borders",name:"Scottish Borders & Dumfries",        postcodes:["TD","DG"],                               maxH:20, maxC:10, lat:55.25, lng:-2.85, status:"waiting" },
  { id:"edinburgh",       name:"Edinburgh, Lothians & Fife",         postcodes:["EH","KY"],                               maxH:20, maxC:10, lat:55.95, lng:-3.20, status:"waiting" },
  { id:"glasgow",         name:"Glasgow, Clyde Valley & Ayrshire",   postcodes:["G","ML","KA","FK"],                      maxH:20, maxC:10, lat:55.86, lng:-4.25, status:"waiting" },
  { id:"argyll",          name:"Argyll, Loch Lomond & Trossachs",    postcodes:["PA"],                                    maxH:20, maxC:10, lat:56.28, lng:-4.90, status:"waiting" },
  { id:"tayside",         name:"Tayside, Perthshire & Dundee",       postcodes:["DD","PH"],                               maxH:20, maxC:10, lat:56.60, lng:-3.50, status:"waiting" },
  { id:"aberdeen",        name:"Aberdeen & Aberdeenshire",           postcodes:["AB"],                                    maxH:20, maxC:10, lat:57.15, lng:-2.11, status:"waiting" },
  { id:"highlands",       name:"Highlands & Inverness",              postcodes:["IV"],                                    maxH:20, maxC:10, lat:57.50, lng:-4.40, status:"waiting" },
  { id:"far_north",       name:"Far North Scotland & Caithness",     postcodes:["KW"],                                    maxH:20, maxC:10, lat:58.44, lng:-3.09, status:"waiting" },
  { id:"western_isles",   name:"Western Isles & Outer Hebrides",     postcodes:["HS"],                                    maxH:20, maxC:10, lat:57.90, lng:-7.00, status:"waiting" },
  { id:"orkney_shetland", name:"Orkney & Shetland",                  postcodes:["ZE"],                                    maxH:20, maxC:10, lat:60.20, lng:-1.15, status:"waiting" },
  // ── Northern Ireland ─────────────────────────────────────────────────────
  { id:"northern_ireland",name:"Northern Ireland",                   postcodes:["BT"],                                    maxH:20, maxC:10, lat:54.78, lng:-6.50, status:"waiting" },
];

// Use longest-prefix match so e.g. "NE" beats "N", "SE" beats "S", "EC" beats "E"
function getSectorId(postcode) {
  if (!postcode) return null;
  const clean = postcode.trim().toUpperCase();
  let bestId = null, bestLen = 0;
  for (const s of SECTORS) {
    for (const p of s.postcodes) {
      if (clean.startsWith(p) && p.length > bestLen) {
        bestId = s.id;
        bestLen = p.length;
      }
    }
  }
  return bestId;
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

  const MAP_SCALE_FACTOR = 2.6;
  const MAP_TX_FACTOR    = 0.535;
  const MAP_TY_FACTOR    = 0.520;
  const UK_MAP_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/UK%20Map.jpg";

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
          .attr("d", path)
          .attr("fill", "rgba(255,255,255,0.08)")
          .attr("stroke", "rgba(255,255,255,0.25)")
          .attr("stroke-width", "0.8");

        if (uk) svg.append("path").datum(uk)
          .attr("d", path)
          .attr("fill", "rgba(255,255,255,0.06)")
          .attr("stroke", "rgba(255,255,255,0.3)")
          .attr("stroke-width", "1");

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

        sectorData.forEach(s => {
          if (!s.lat || !s.lng) return;
          const c = proj([s.lng, s.lat]);
          if (!c || c[0]<0 || c[1]<0 || c[0]>W || c[1]>H) return;
          const col = SECTOR_MAP_COLORS[s.computedStatus] || "#94a3b8";
          const g   = svg.append("g").style("cursor", "pointer");

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
      <div ref={ref} className="flex-1 w-full min-h-0 relative overflow-hidden rounded-lg">
        <img src={UK_MAP_IMG} alt="UK Map" className="absolute inset-0 w-full h-full object-cover" draggable="false" />
        <div className="absolute inset-0 bg-[#1E3A5F]/10 pointer-events-none" />
      </div>
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

  const canDelete = true; // Admin panel already requires admin role

  const [members,       setMembers      ] = useState([]);
  const [loading,       setLoading      ] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);
  const [crmLoading,    setCrmLoading   ] = useState(true);
  const [pageViews,     setPageViews    ] = useState([]);
  const [viewsLoading,  setViewsLoading ] = useState(true);
  const [guests,        setGuests       ] = useState([]);
  const [bookings,      setBookings     ] = useState([]);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [guestSessions, setGuestSessions] = useState([]);

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

  const fetchPageViews = async () => {
    setViewsLoading(true);
    try {
      const data = await base44.entities.PageView.list("-timestamp", 5000);
      setPageViews(data || []);
    } catch { setPageViews([]); }
    setViewsLoading(false);
  };

  const [guestReviews, setGuestReviews] = useState([]);

  const fetchGuests = async () => {
    setGuestsLoading(true);
    try {
      const [g, gr] = await Promise.all([
        base44.entities.Guest.list("-created_date", 1000),
        base44.entities.Review.filter({ review_type: "host_to_guest" }),
      ]);
      setGuests(g || []);
      setGuestReviews(gr || []);
    } catch { setGuests([]); setGuestReviews([]); }
    setGuestsLoading(false);
  };

  const fetchGuestSessions = async () => {
    try {
      const sessions = await base44.entities.UserSession.filter({ role: "guest" });
      setGuestSessions(sessions || []);
    } catch { setGuestSessions([]); }
  };

  useEffect(() => { fetchMembers(); fetchSubscriptions(); fetchPageViews(); fetchGuests(); fetchGuestSessions(); }, []);

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
 if (!window.confirm(`Delete ${member.full_name}? This will remove their account and all credentials. This cannot be undone.`)) return;
 setML(member.id, "delete");
 try {
   await base44.functions.invoke("deleteAccount", { admin_delete_email: member.email });
   toast.success("Account fully deleted");
 } catch (e) {
   toast.error("Delete failed");
   console.error(e);
 }
 setML(member.id, null);
 fetchMembers();
};

const handleApproveGuestAsHost = async (member) => {
 setML(member.id, "approve_guest");
 try {
   await base44.functions.invoke("approveGuestAsHost", { member_id: member.id });
   toast.success(`${member.full_name} approved as host — can now access Host Dashboard`);
 } catch (e) {
   toast.error("Approval failed");
   console.error(e);
 }
 setML(member.id, null);
 fetchMembers();
};

const handleBan = async (member) => {
   const reason = window.prompt(`Ban reason for ${member.full_name} (this will strip their founding member access and auto-promote the next waitlisted person in their area):`);
   if (reason === null) return;
   setML(member.id, "ban");
   try {
     const res = await base44.functions.invoke("banFoundingMember", { member_id: member.id, ban_reason: reason || "Admin action" });
     const promoted = res.data?.promoted;
     if (promoted) {
       toast.success(`${member.full_name} banned. Waitlist member ${promoted.full_name} has been invited.`);
     } else {
       toast.success(`${member.full_name} banned. No eligible waitlist members found to promote.`);
     }
   } catch (e) {
     toast.error("Ban failed");
     console.error(e);
   }
   setML(member.id, null);
   fetchMembers();
 };

const handleDocApprove = async (member) => {
   setML(member.id, "doc_approve");
   try {
     // Update the VerificationDocuments record
     if (member.user_id) {
       const docs = await base44.entities.VerificationDocuments.filter({ user_id: member.user_id });
       if (docs.length > 0) {
         const latestDoc = docs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
         await base44.entities.VerificationDocuments.update(latestDoc.id, { verification_status: "approved" });
       }
     }

     // Mark documents_verified on both FoundingMember and User
     await base44.entities.FoundingMember.update(member.id, { documents_verified: true });
     if (member.user_id) {
       await base44.entities.User.update(member.user_id, { documents_verified: true });
     }

     // Send approval email
     await base44.functions.invoke("sendEmail", {
       to: member.email,
       subject: "You're one step closer to publishing your property — HostKeep",
       html: buildEmail({
         heading: "Document Approved",
         body: `Great news — your verification document has been reviewed and approved by our team.<br><br>You are now one step closer to publishing your property on HostKeep. To publish, you will need all three of the following in place:<br><br><strong>1. Approved verification document</strong> — done ✓<br><strong>2. Active HostKeep subscription</strong><br><strong>3. Connected Stripe account</strong> (to receive payments from guests)<br><br>Once all three are confirmed, your publish button will become available. If you have any questions, contact us at <a href="mailto:hello@hostkeepdigital.co.uk">hello@hostkeepdigital.co.uk</a>.`,
       }),
     });

     // Run gate check — may promote to approved if other gates are also met
     if (member.user_id) {
       await base44.functions.invoke("checkApprovalGates", { user_id: member.user_id });
     }

     toast.success(`${member.full_name} — document approved`);
   } catch (e) {
     toast.error("Approval failed");
     console.error(e);
   }
   setML(member.id, null);
   fetchMembers();
 };

const handleDocFail = async (member, isAttempt2) => {
   setML(member.id, "doc_fail");
   try {
     let nextStatus;
      if (member.approval_status === "documentation_failed_attempt_1") {
        nextStatus = "documentation_failed_attempt_2";
      } else {
        nextStatus = "documentation_failed_attempt_1";
      }

     await base44.entities.FoundingMember.update(member.id, { approval_status: nextStatus });

     const docs = await base44.entities.VerificationDocuments.filter({ user_id: member.user_id });
     if (docs.length > 0) {
       const latestDoc = docs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
       await base44.entities.VerificationDocuments.update(latestDoc.id, { verification_status: "rejected" });
     }

     const attemptBody = nextStatus === "documentation_failed_attempt_1"
       ? "This was your first attempt. You have 1 attempt remaining. Please log in and re-upload a clear, valid document."
       : "This was your second attempt. You have no attempts remaining after this. Please log in immediately and upload a clear, valid document — this is your final chance before your account is suspended.";

     await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "Action required: your verification document was not approved — HostKeep",
      html: buildEmail({
        heading: "Document Review Result",
        body: `Your verification document has been reviewed by our team and deemed unsatisfactory.<br><br>${attemptBody}<br><br>You will find the upload option on your property verification page, in the same place as when you first submitted your document.<br><br>If you have any questions, contact <a href="mailto:hello@hostkeepdigital.co.uk">hello@hostkeepdigital.co.uk</a>.`,
      }),
     });
     toast.success(`${member.full_name} — document failed, member notified`);
   } catch (e) {
     toast.error("Document fail action failed");
     console.error(e);
   }
   setML(member.id, null);
   fetchMembers();
  };

const handleResetMember = async (member) => {
  if (!window.confirm(`Reset ${member.full_name} back to Pending? This clears their onboarding progress.`)) return;
  setML(member.id, "reset");
  try {
    await base44.entities.FoundingMember.update(member.id, {
      approval_status: "pending",
      onboarding_token: null,
      onboarding_expires_at: null,
      user_id: null,
      ban_reason: null,
    });
    if (member.user_id) {
      const docs = await base44.entities.VerificationDocuments.filter({ user_id: member.user_id });
      for (const doc of docs) {
        await base44.entities.VerificationDocuments.update(doc.id, { verification_status: "pending" });
      }
    }
    toast.success(`${member.full_name} reset to Pending`);
  } catch (e) {
    toast.error("Reset failed");
    console.error(e);
  }
  setML(member.id, null);
  fetchMembers();
};

const handleDeleteMember = async (member) => {
  if (!window.confirm(`Permanently delete ${member.full_name} and all associated records? This cannot be undone.`)) return;
  setML(member.id, "delete");
  try {
    const userId = member.user_id;

    // Delete verification documents
    if (userId) {
      const docs = await base44.entities.VerificationDocuments.filter({ user_id: userId });
      for (const doc of docs) await base44.entities.VerificationDocuments.delete(doc.id);
    }

    // Delete properties and their bookings/jobs
    if (userId) {
      const props = await base44.entities.Property.filter({ owner_id: userId });
      for (const prop of props) {
        const [jobs, bookings] = await Promise.all([
          base44.entities.CleaningJob.filter({ property_id: prop.id }),
          base44.entities.Booking.filter({ property_id: prop.id }),
        ]);
        for (const job of jobs) await base44.entities.CleaningJob.delete(job.id);
        for (const booking of bookings) await base44.entities.Booking.delete(booking.id);
        await base44.entities.Property.delete(prop.id);
      }

      // Delete messages
      const messages = await base44.entities.Message.filter({ sender_id: userId });
      for (const msg of messages) await base44.entities.Message.delete(msg.id);
    }

    // Delete the FoundingMember record
    await base44.entities.FoundingMember.delete(member.id);

    toast.success(`${member.full_name} and all associated records deleted`);
  } catch (e) {
    toast.error("Delete failed: " + e.message);
    console.error(e);
  }
  setML(member.id, null);
  fetchMembers();
};

const DOC_LABELS = { government_id: "Government ID", selfie: "Selfie with ID", utility_bill: "Proof of Property" };

  const handleSubmitDocDecision = async (member, decisions) => {
  // 1. Update each VerificationDocuments record to the decided status
  if (member.user_id) {
    const allDocs = await base44.entities.VerificationDocuments.filter({ user_id: member.user_id });
    for (const [docType, status] of Object.entries(decisions)) {
      const typeDocs = allDocs
        .filter(d => d.document_type === docType)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      if (typeDocs.length > 0) {
        await base44.entities.VerificationDocuments.update(typeDocs[0].id, { verification_status: status });
      }
    }
  }

  const allApproved = Object.values(decisions).every(v => v === "approved");

  if (allApproved) {
    // All three passed — run approval logic
    await base44.entities.FoundingMember.update(member.id, { documents_verified: true });
    if (member.user_id) {
      await base44.entities.User.update(member.user_id, { documents_verified: true });
      await base44.functions.invoke("checkApprovalGates", { user_id: member.user_id });
    }
    await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "Your verification documents have been approved — HostKeep",
      html: buildEmail({
        heading: "Documents Approved ✓",
        body: `Great news, ${member.full_name?.split(" ")[0] || "there"} — your verification documents have been reviewed and approved by our team.<br><br>You're almost ready to publish your property on HostKeep. To go live, you'll need two more things in place:<br><br><strong>1. A HostKeep subscription</strong> — choose the plan that works best for you from your dashboard.<br><br><strong>2. A connected Stripe account</strong> — this is how you'll receive payments from guests directly and securely.<br><br>Once both are confirmed, your property will be ready to publish and visible to guests across Cornwall.<br><br>If you have any questions or need a hand getting set up, we're always happy to help — just drop us a message at <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;">hello@hostkeepdigital.co.uk</a>.`,
        buttonText: "Go to My Dashboard",
        buttonUrl: "https://hostkeepdigital.co.uk/HostDashboard",
      }),
    });
    toast.success(`${member.full_name} — all documents approved`);
  } else {
    // At least one rejected — build summary and advance fail state
    const summaryLines = Object.entries(decisions)
      .map(([type, result]) => `<strong>${DOC_LABELS[type]}</strong> — ${result === "approved" ? "Passed ✓" : "Failed ✗"}`)
      .join("<br>");
    const failedLabels = Object.entries(decisions)
      .filter(([, r]) => r === "rejected")
      .map(([t]) => DOC_LABELS[t]);

    const currentStatus = member.approval_status;
    let nextStatus;
    if (currentStatus === "documentation_failed_attempt_1") {
      nextStatus = "documentation_failed_attempt_2";
    } else {
      nextStatus = "documentation_failed_attempt_1";
    }
    await base44.entities.FoundingMember.update(member.id, { approval_status: nextStatus });

    await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "Action required: document review result — HostKeep",
      html: buildEmail({
        heading: "Document Review Result",
        body: `Your verification documents have been reviewed by our team. Here is a summary of the outcome:<br><br>${summaryLines}<br><br>The following document(s) require attention: <strong>${failedLabels.join(" and ")}</strong>.<br><br>Please log in and resubmit only the failed documents at your earliest convenience.<br><br>If you have any questions, contact us at <a href="mailto:hello@hostkeepdigital.co.uk">hello@hostkeepdigital.co.uk</a>.`,
      }),
    });
    toast.success(`${member.full_name} — decision submitted, member notified`);
  }
  await fetchMembers();
  await queryClient.invalidateQueries(["all-verification-docs"]);
};

const handleDocBan = async (member) => {
  setML(member.id, "doc_ban");
  try {
    await base44.entities.FoundingMember.update(member.id, {
      approval_status: "banned_documentation_failure",
      ban_reason: "Property documentation not approved after 3 attempts."
    });
    
    const props = await base44.entities.Property.filter({ owner_id: member.user_id });
    for (const prop of props) {
      await base44.entities.Property.update(prop.id, { status: "paused" });
    }
    
    const docs = await base44.entities.VerificationDocuments.filter({ user_id: member.user_id });
    if (docs.length > 0) {
      const latestDoc = docs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      await base44.entities.VerificationDocuments.update(latestDoc.id, { verification_status: "rejected" });
    }
    
    await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "Your HostKeep account has been suspended — HostKeep",
      html: buildEmail({
        heading: "Account Suspended",
        body: `We are writing to inform you that your HostKeep account has been suspended.<br><br>After three attempts, we were unable to approve your verification documentation. As a result, your account and any associated properties have been suspended and you will no longer be able to publish on HostKeep.<br><br>If you believe this is an error, please contact us at <a href="mailto:hello@hostkeepdigital.co.uk">hello@hostkeepdigital.co.uk</a>.`,
      }),
    });
    toast.success(`${member.full_name} banned — documentation failure`);
  } catch (e) {
    toast.error("Ban action failed");
    console.error(e);
  }
  setML(member.id, null);
  fetchMembers();
 };

  // ── VERIFICATION QUERIES ──────────────────────────────────────────────────

  const { data: pendingDocs   = [] } = useQuery({ queryKey:["pending-verifications"], queryFn: () => base44.entities.VerificationDocuments.filter({ verification_status:"pending" }, "-created_date") });
  const { data: allVerificationDocs = [] } = useQuery({ queryKey:["all-verification-docs"], queryFn: () => base44.entities.VerificationDocuments.list("-created_date", 1000) });
  const { data: allProperties = [] } = useQuery({ queryKey:["admin-all-properties"], queryFn: () => base44.entities.Property.list("-created_date", 5000) });
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
  const bannedAdminMembers       = byStatus("banned");

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

  const MemberTable = ({ members: rows, showActions = false, showBanAction = false, showDeleteButton = false }) => {
    const [userGates, setUserGates] = useState({});

    useEffect(() => {
      const fetchUserGates = async () => {
        const gatesData = {};
        for (const m of rows) {
          if (m.user_id && ["awaiting_document_verification", "documentation_failed_attempt_1", "documentation_failed_attempt_2"].includes(m.approval_status)) {
            try {
              const users = await base44.entities.User.filter({ id: m.user_id });
              if (users?.[0]) {
                gatesData[m.id] = users[0];
              }
            } catch (e) {
              console.error(`Failed to fetch user gates for ${m.id}:`, e);
            }
          }
        }
        setUserGates(gatesData);
      };
      if (rows.length > 0) {
        fetchUserGates();
      }
    }, [rows]);

    const GateItem = ({ label, status, timeElapsed }) => (
      <div className="flex items-center gap-2 text-xs py-1">
        {status ? (
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
        ) : (
          <X className="w-4 h-4 text-red-500 flex-shrink-0" />
        )}
        <span className={status ? "text-gray-600" : "text-gray-500"}>{label}</span>
        {!status && timeElapsed && <span className="text-gray-400 text-xs">({timeElapsed})</span>}
      </div>
    );

    return (
      <div className="max-h-[220px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Full Name","Email","Role","Postcode","Status","Signed Up", (showActions || showBanAction || showDeleteButton) ? "Actions / Gates" : null]
                .filter(Boolean).map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(m => {
              const isAwaitingOrBeyond = ["awaiting_document_verification", "documentation_failed_attempt_1", "documentation_failed_attempt_2"].includes(m.approval_status);
              const userGate = userGates[m.id];
              const timeElapsedDocs = userGate?.documents_submitted_at ? Math.floor((Date.now() - new Date(userGate.documents_submitted_at).getTime()) / (1000 * 60 * 60)) : null;

              return (
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
                  {(showActions || showBanAction || (showDeleteButton && canDelete)) && (
                    <td className="px-4 py-3">
                      {isAwaitingOrBeyond && userGate ? (
                        <div className="space-y-0.5 text-xs">
                          <GateItem label="Documents" status={userGate.documents_verified} timeElapsed={timeElapsedDocs ? `${timeElapsedDocs}h` : null} />
                          <GateItem label="Stripe" status={userGate.stripe_verified} />
                          <GateItem label="Subscription" status={userGate.subscription_active} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {showActions && <>      
                            <Button size="sm" className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white" disabled={!!actionLoading[m.id]} onClick={() => handleApprove(m)}>
                              {actionLoading[m.id]==="approve" ? "..." : <><Check className="w-3 h-3 mr-1"/>Approve</>}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" disabled={!!actionLoading[m.id]} onClick={() => handleWaitlist(m)}>
                              {actionLoading[m.id]==="waitlist" ? "..." : "Waitlist"}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-red-300 text-red-600 hover:bg-red-50" disabled={!!actionLoading[m.id]} onClick={() => handleReject(m)}>
                              {actionLoading[m.id]==="reject" ? "..." : <><X className="w-3 h-3 mr-1"/>Reject</>}
                            </Button>
                          </>}
                          {showBanAction && (
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-red-800 text-red-800 hover:bg-red-50" disabled={!!actionLoading[m.id]} onClick={() => handleBan(m)}>
                              {actionLoading[m.id]==="ban" ? "..." : <><Ban className="w-3 h-3 mr-1"/>Ban</>}
                            </Button>
                          )}
                          {showDeleteButton && canDelete && (
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-amber-400 text-amber-700 hover:bg-amber-50" disabled={!!actionLoading[m.id]} onClick={() => handleResetMember(m)}>
                              {actionLoading[m.id]==="reset" ? "..." : "Reset"}
                            </Button>
                          )}
                          {showDeleteButton && canDelete && (
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-red-400 text-red-700 hover:bg-red-50" disabled={!!actionLoading[m.id]} onClick={() => handleDeleteMember(m)}>
                              {actionLoading[m.id]==="delete" ? "..." : "Delete"}
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={(showActions || showBanAction || showDeleteButton) ? 7 : 6} className="px-4 py-8 text-center text-gray-300 text-sm">No records in this section</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

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
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
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
        <div className="flex border-t border-gray-100 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {[
            { id:"onboarding",     label:"Onboarding",         Icon:Users         },
            { id:"complaints",    label:"Complaints",        Icon:AlertTriangle },
            { id:"guests",        label:"Guests & Bookings",  Icon:BarChart2     },
            { id:"crm",           label:"CRM & Revenue",     Icon:TrendingUp    },
            { id:"smartpricing",  label:"Smart Pricing",     Icon:TrendingUp    },
            { id:"sectors",       label:"UK Sectors",        Icon:Globe         },
            { id:"devtools",      label:"Dev Tools & Tests", Icon:Settings      },
          ].map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab===id ? "border-[#0d9488] text-[#0d9488]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          </div>
      </div>

      {/* ── GUESTS & BOOKINGS ──────────────────────────────────────────── */}
      {activeTab === "guests" && (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {guestsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : (() => {

            // ── TRAFFIC FUNNEL ──────────────────────────────────────────────
            const now = new Date();
            const last30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
            const last7  = new Date(now - 7  * 24 * 60 * 60 * 1000);

            const uniqueVisitorsAll  = new Set(pageViews.map(v => v.visitor_id)).size;
            const uniqueVisitors30   = new Set(pageViews.filter(v => new Date(v.timestamp) >= last30).map(v => v.visitor_id)).size;

            const signupsAll  = guests.length;
            const signups30   = guests.filter(g => g.created_date && new Date(g.created_date) >= last30).length;
            const signups7    = guests.filter(g => g.created_date && new Date(g.created_date) >= last7).length;

            const guestsWithBookings = new Set(bookings.map(b => b.guest_email).filter(Boolean)).size;
            const conversionRate = signupsAll > 0 ? ((guestsWithBookings / signupsAll) * 100).toFixed(1) : "0.0";
            const signupRate = uniqueVisitors30 > 0 ? ((signups30 / uniqueVisitors30) * 100).toFixed(1) : "0.0";

            // ── SIGNIN TREND (last 30 days, by day) ────────────────────────
            const signinsByDay = {};
            guestSessions.forEach(s => {
              if (!s.created_date) return;
              const d = new Date(s.created_date);
              if (d < last30) return;
              const key = d.toISOString().split("T")[0];
              signinsByDay[key] = (signinsByDay[key] || 0) + 1;
            });

            const signupsByDay = {};
            guests.forEach(g => {
              if (!g.created_date) return;
              const d = new Date(g.created_date);
              if (d < last30) return;
              const key = d.toISOString().split("T")[0];
              signupsByDay[key] = (signupsByDay[key] || 0) + 1;
            });

            const dayLabels = [];
            for (let i = 29; i >= 0; i--) {
              const d = new Date(now - i * 24 * 60 * 60 * 1000);
              dayLabels.push(d.toISOString().split("T")[0]);
            }

            const maxSignins = Math.max(...dayLabels.map(d => signinsByDay[d] || 0), 1);
            const maxSignups = Math.max(...dayLabels.map(d => signupsByDay[d] || 0), 1);

            // ── GUEST LIST ─────────────────────────────────────────────────
            const guestList = [...guests].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            const guestBookingMap = bookings.reduce((acc, b) => {
              if (b.guest_email) acc[b.guest_email] = (acc[b.guest_email] || 0) + 1;
              return acc;
            }, {});

            const uniqueSigninEmails = new Set(guestSessions.map(s => s.email));
            const last7signin = new Set(guestSessions.filter(s => new Date(s.created_date) >= last7).map(s => s.email));

            // ── BOOKING ACTIVITY (existing) ────────────────────────────────
            const bookingsByGuest = bookings.reduce((acc, b) => {
              const key = b.guest_email || b.guest_id || "unknown";
              if (!acc[key]) acc[key] = { name: b.guest_name, email: b.guest_email, count: 0, totalSpend: 0, lastBooking: null, statuses: {} };
              acc[key].count++;
              acc[key].totalSpend += b.total_amount || 0;
              if (!acc[key].lastBooking || b.check_in > acc[key].lastBooking) acc[key].lastBooking = b.check_in;
              const s = b.booking_status || "unknown";
              acc[key].statuses[s] = (acc[key].statuses[s] || 0) + 1;
              return acc;
            }, {});

            const guestRows = Object.values(bookingsByGuest).sort((a, b) => b.count - a.count);
            const totalBookings = bookings.length;
            const confirmedBookings = bookings.filter(b => ["confirmed","checked_in","completed"].includes(b.booking_status)).length;
            const totalRevenue = bookings.filter(b => b.booking_status !== "cancelled" && b.booking_status !== "declined").reduce((s, b) => s + (b.total_amount || 0), 0);
            const repeatGuests = guestRows.filter(g => g.count > 1).length;

            return (
              <>
                {/* ── SECTION 1: Traffic Funnel ── */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Traffic & Conversion Funnel</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <MetricCard icon={Eye}         label="Unique Visitors (all time)" value={uniqueVisitorsAll}    color="navy" />
                    <MetricCard icon={UserPlus}    label="Guest Signups (all time)"   value={signupsAll}           color="teal" />
                    <MetricCard icon={ShoppingBag} label="Guests Who Booked"          value={guestsWithBookings}   color="green" />
                    <MetricCard icon={TrendingUp}  label="Booking Conversion"         value={`${conversionRate}%`} color="purple" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard icon={Calendar}  label="Signups (last 30 days)"  value={signups30}          color="teal" />
                    <MetricCard icon={Calendar}  label="Signups (last 7 days)"   value={signups7}           color="teal" />
                    <MetricCard icon={LogIn}     label="Active Guests (last 7d)" value={last7signin.size}   color="navy" />
                    <MetricCard icon={Percent}   label="Visitor → Signup (30d)"  value={`${signupRate}%`}   color="purple" />
                  </div>
                </div>

                {/* ── SECTION 2: Signup & Signin Trends ── */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">New Signups — Last 30 Days</h3>
                    <p className="text-xs text-gray-400 mb-4">{signups30} new guests registered</p>
                    <div className="flex items-end gap-px h-24">
                      {dayLabels.map((d, i) => {
                        const count = signupsByDay[d] || 0;
                        const height = Math.max(2, (count / maxSignups) * 100);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                            <div className="w-full bg-teal-500 rounded-t hover:bg-teal-600 transition-colors" style={{ height: `${height}%` }} />
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                              {d.slice(5)} · {count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Sign-in Activity — Last 30 Days</h3>
                    <p className="text-xs text-gray-400 mb-4">{uniqueSigninEmails.size} unique guests ever signed in</p>
                    <div className="flex items-end gap-px h-24">
                      {dayLabels.map((d, i) => {
                        const count = signinsByDay[d] || 0;
                        const height = Math.max(2, (count / maxSignins) * 100);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                            <div className="w-full bg-[#1E3A5F] rounded-t hover:bg-[#16304f] transition-colors" style={{ height: `${height}%` }} />
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                              {d.slice(5)} · {count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: Guest Signup List ── */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Guest Signups</h2>
                    <span className="text-xs text-gray-400">{guestList.length} total registered guests</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-gray-100">
                          {["Name", "Email", "Signed Up", "Bookings", "Last Sign-in", "Status"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {guestList.map((g, i) => {
                          const bookingCount = guestBookingMap[g.email] || 0;
                          const lastSession = guestSessions.filter(s => s.email === g.email).sort((a,b) => new Date(b.created_date) - new Date(a.created_date))[0];
                          const isRecent = g.created_date && new Date(g.created_date) >= last7;
                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {[g.forename, g.surname].filter(Boolean).join(" ") || g.full_name || "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{g.email || "—"}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">
                                {g.created_date ? new Date(g.created_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                {isRecent && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold">New</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${bookingCount > 0 ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"}`}>
                                  {bookingCount > 0 ? `${bookingCount} booking${bookingCount > 1 ? "s" : ""}` : "No bookings"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs">
                                {lastSession?.created_date ? new Date(lastSession.created_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Never"}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bookingCount > 1 ? "bg-purple-100 text-purple-700" : bookingCount === 1 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                  {bookingCount > 1 ? "Repeat" : bookingCount === 1 ? "Booked" : "Browsing"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {guestList.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-300 text-sm">No guest signups yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── SECTION 4: Booking Activity (existing) ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard icon={Users}        label="Total Guests"       value={guests.length || guestRows.length} color="navy" />
                  <MetricCard icon={BarChart2}    label="Total Bookings"     value={totalBookings}      color="teal" />
                  <MetricCard icon={CheckCircle}  label="Confirmed / Active" value={confirmedBookings}  color="green" />
                  <MetricCard icon={Star}         label="Repeat Guests"      value={repeatGuests}       color="purple" />
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Guest Booking Activity</h2>
                    <span className="text-xs text-gray-400">{guestRows.length} unique guests · £{totalRevenue.toLocaleString("en-GB", { maximumFractionDigits: 0 })} total revenue</span>
                  </div>
                  <div className="max-h-[480px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-gray-100">
                          {["Guest","Email","Bookings","Total Spend","Last Stay","Status Breakdown"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {guestRows.map((g, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                              {g.count > 1 && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" title="Repeat guest" />}
                              {g.name || "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{g.email || "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${g.count > 2 ? "bg-teal-100 text-teal-700" : g.count > 1 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                                {g.count}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 font-medium">£{g.totalSpend.toLocaleString("en-GB", { maximumFractionDigits: 0 })}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{g.lastBooking || "—"}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(g.statuses).map(([s, n]) => (
                                  <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{s} ×{n}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {guestRows.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-300 text-sm">No bookings found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── COMPLAINTS ───────────────────────────────────────────────────── */}
      {activeTab === "complaints" && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <ComplaintsTab />
        </div>
      )}

      {/* ── ONBOARDING ────────────────────────────────────────────────────── */}
      {activeTab === "onboarding" && (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Summary metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard icon={Users}        label="Pending Applications" value={pendingMembers.length}  color="navy" />
                <MetricCard icon={CheckCircle}  label="Approved Members"     value={approvedMembers.length} color="green" />
                <MetricCard icon={Clock}        label="Active Onboarding"    value={activeHosts + activeCleaners} color="teal" />
                <MetricCard icon={Ban}          label="Rejected / Banned"     value={rejectedMembers.length + bannedEmailMembers.length + bannedDocMembers.length + bannedFraudMembers.length + bannedManualMembers.length + bannedAdminMembers.length} color="red" />
              </div>

              <Section title="Interest (Not Yet Applied)" count={interestMembers.length} accent="gray">
               <MemberTable members={interestMembers} showDeleteButton={canDelete} />
              </Section>

              <Section title="Pending Applications" count={pendingMembers.length} accent="amber">
               <MemberTable members={pendingMembers} showActions showDeleteButton={canDelete} />
              </Section>

              <Section title="Invited" count={invitedMembers.length} accent="blue">
                <MemberTable members={invitedMembers} showBanAction showDeleteButton={canDelete} />
              </Section>

              <Section title="Password Protected" count={passwordProtectedMembers.length} accent="indigo">
                <MemberTable members={passwordProtectedMembers} showBanAction showDeleteButton={canDelete} />
              </Section>

              <Section title="Awaiting Document Verification" count={awaitingDocMembers.length} accent="purple">
                <DocMemberTable members={awaitingDocMembers} properties={allProperties} verificationDocs={allVerificationDocs} showApproveButton showFailButton onSubmitDecision={handleSubmitDocDecision} showDeleteButton={canDelete} onDelete={handleDeleteMember} actionLoading={actionLoading} />
              </Section>

              <Section title="Document Failed — Attempt 1" count={docFail1Members.length} accent="orange">
                <DocMemberTable members={docFail1Members} properties={allProperties} verificationDocs={allVerificationDocs} showApproveButton showFailButton onSubmitDecision={handleSubmitDocDecision} showDeleteButton={canDelete} onDelete={handleDeleteMember} actionLoading={actionLoading} />
              </Section>

              <Section title="Document Failed — Attempt 2" count={docFail2Members.length} accent="red">
                <DocMemberTable members={docFail2Members} properties={allProperties} verificationDocs={allVerificationDocs} showApproveButton showFailButton onSubmitDecision={handleSubmitDocDecision} showDeleteButton={canDelete} onDelete={handleDeleteMember} actionLoading={actionLoading} />
              </Section>

              <Section title="Approved" count={approvedMembers.length} accent="green">
                 <MemberTable members={approvedMembers} showBanAction />
              </Section>

              <Section title="Waitlist" count={waitlistMembers.length} accent="orange">
                 <MemberTable members={waitlistMembers} />
              </Section>

              <Section title="Rejected — Second Chance" count={rejectedPendingMembers.length} accent="yellow">
                <MemberTable members={rejectedPendingMembers} showDeleteButton={canDelete} />
              </Section>

              <Section title="Rejected" count={rejectedMembers.length} accent="red">
                <MemberTable members={rejectedMembers} showDeleteButton={canDelete} />
              </Section>

              <Section title="Out of Area" count={outOfAreaMembers.length} accent="gray">
                 <MemberTable members={outOfAreaMembers} />
              </Section>

              <Section title="Banned" count={bannedEmailMembers.length + bannedDocMembers.length + bannedFraudMembers.length + bannedManualMembers.length + bannedAdminMembers.length} accent="red">
                <MemberTable members={[...bannedEmailMembers, ...bannedDocMembers, ...bannedFraudMembers, ...bannedManualMembers, ...bannedAdminMembers]} showDeleteButton={canDelete} />
              </Section>
            </>
          )}
        </div>
      )}

      {/* ── CRM & REVENUE ─────────────────────────────────────────────────── */}
      {activeTab === "crm" && (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {crmLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard icon={PoundSterling} label="Monthly Recurring Revenue" value={`£${mrr.toFixed(0)}`} color="green" />
                <MetricCard icon={TrendingUp}    label="Active Subscriptions"      value={activeSubs.length}       color="teal" />
                <MetricCard icon={XCircle}       label="Cancelled Subscriptions"   value={cancelledSubs.length}    color="red" />
                <MetricCard icon={PoundSterling} label="Lost Revenue (cancelled)"  value={`£${lostRevenue.toFixed(0)}`} color="red" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <MetricCard icon={Star}         label="Host MRR"    value={`£${hostMrr.toFixed(0)}`}    color="navy" />
                <MetricCard icon={Users}        label="Cleaner MRR" value={`£${cleanerMrr.toFixed(0)}`} color="purple" />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Plan Breakdown</h2>
                {Object.keys(planBreakdown).length === 0 ? (
                  <p className="text-sm text-gray-400">No active subscriptions</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["Plan","Subscribers","Monthly Revenue"].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {Object.entries(planBreakdown).map(([plan, { count, revenue }]) => (
                          <tr key={plan}>
                            <td className="px-4 py-3 font-medium text-gray-900">{PLAN_LABELS[plan] || plan}</td>
                            <td className="px-4 py-3 text-gray-600">{count}</td>
                            <td className="px-4 py-3 text-green-700 font-medium">£{revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Site Analytics</h2>
                <SiteVisitorWidget pageViews={pageViews} loading={viewsLoading} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SMART PRICING ──────────────────────────────────────────────────── */}
      {activeTab === "smartpricing" && <SmartPricingTab />}

      {/* ── UK SECTORS ────────────────────────────────────────────────────── */}
      {activeTab === "sectors" && (
        <SectorsTab sectorData={sectorData} members={members} />
      )}



      {/* ── DEV TOOLS ────────────────────────────────────────────────────── */}
      {activeTab === "devtools" && (
        <DevToolsSection members={members} user={user} />
      )}
    </div>
  );
}