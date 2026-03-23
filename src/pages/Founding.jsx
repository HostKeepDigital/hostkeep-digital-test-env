import { useState, useEffect } from "react";
import { buildEmail } from "@/lib/emailTemplate";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Home, Sparkles, AlertTriangle, Loader2 } from "lucide-react";

const HOST_LIMIT = 50;
const CLEANER_LIMIT = 30;
const CORNWALL_PREFIXES = ["TR", "PL", "EX"];

function isCornwallPostcode(postcode) {
  const clean = postcode.trim().toUpperCase().replace(/\s+/g, "");
  return CORNWALL_PREFIXES.some(p => clean.startsWith(p));
}

function SpotsCounter({ used, limit, color }) {
  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, (used / limit) * 100);
  const isFull = remaining === 0;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm mb-1">
        <span className={isFull ? "text-red-600 font-semibold" : `text-${color}-700 font-semibold`}>
          {isFull ? "Fully Claimed" : `${remaining} spots remaining`}
        </span>
        <span className="text-gray-500">{used}/{limit} claimed</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-red-500" : color === "teal" ? "bg-teal-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Founding() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cornwallWarning, setCornwallWarning] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    postcode: "",
    role: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.entities.FoundingMember.list("-signup_timestamp", 500)
      .then(data => setMembers(data || []))
      .finally(() => setLoading(false));
  }, []);

  // Counter only counts approved members
  const approvedMembers = members.filter(m => m.approval_status === "approved");
  const hostCount = approvedMembers.filter(m => m.role === "host").length;
  const cleanerCount = approvedMembers.filter(m => m.role === "cleaner").length;
  const hostFull = hostCount >= HOST_LIMIT;
  const cleanerFull = cleanerCount >= CLEANER_LIMIT;

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "A valid email is required.";
    if (!form.postcode.trim()) e.postcode = "Postcode is required.";
    if (!form.role) e.role = "Please select a role.";
    return e;
  };

  const handlePostcodeBlur = () => {
    if (form.postcode && !isCornwallPostcode(form.postcode)) {
      setCornwallWarning(true);
    } else {
      setCornwallWarning(false);
    }
  };

  const isOutOfArea = form.postcode && !isCornwallPostcode(form.postcode);

  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const outOfArea = !isCornwallPostcode(form.postcode);
    const roleLabel = form.role === "host" ? "Host" : "Cleaner";
    const firstName = form.full_name.trim().split(" ")[0];
    const email = form.email.toLowerCase().trim();
    const postcode = form.postcode.toUpperCase().trim();
    const now = new Date().toISOString();

    setSubmitting(true);
    try {
      // Step 2 — Create FoundingMember record
      await base44.entities.FoundingMember.create({
        full_name: form.full_name.trim(),
        email,
        postcode,
        role: form.role,
        approval_status: outOfArea ? "out_of_area" : "pending",
        signup_timestamp: now,
      });

      if (!outOfArea) {
        // Step 3 — Send pending email to applicant
        await base44.integrations.Core.SendEmail({
          from_name: "HostKeep",
          to: email,
          subject: "You're on the list — HostKeep",
          html: buildEmail({
            heading: "You're on the list!",
            body: `Thank you for applying to become a Founding ${roleLabel} on HostKeep.<br><br>We're reviewing your application and will be in touch within 24 hours to let you know if you've made it into the beta.<br><br>You don't need to do anything right now.`,
          }),
        });

        // Step 4 — Send admin notification email
        await base44.integrations.Core.SendEmail({
          from_name: "HostKeep",
          to: "admin@hostkeepdigital.co.uk",
          subject: `New Founding Member Application — ${form.full_name.trim()} (${roleLabel})`,
          html: buildEmail({
            heading: "New Founding Member Application",
            body: `A new founding member application has been submitted.<br><br><strong>Name:</strong> ${form.full_name.trim()}<br><strong>Email:</strong> ${email}<br><strong>Postcode:</strong> ${postcode}<br><strong>Role:</strong> ${roleLabel}<br><strong>Submitted:</strong> ${now}`,
            buttonText: "Review in Admin Panel",
            buttonUrl: "https://hostkeepdigital.co.uk/AdminPanel",
          }),
        });
      }

      // Step 5 — Navigate to thank you
      navigate("/founding-thankyou");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/d/1dO0GP74-0q34O64CKSL0gGCan9qeELf5')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center text-white">
          <Badge className="bg-white/20 text-white border-0 mb-4 text-sm px-4 py-1">
            <Sparkles className="w-4 h-4 mr-1 inline" /> Limited Time Offer
          </Badge>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Become a Founding Member
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-teal-100 max-w-2xl mx-auto"
          >
            Be part of HostKeep from day one. Founding members get exclusive perks — locked in forever. Limited spots available.
          </motion.p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* Perk cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border-2 p-8 ${hostFull ? "border-gray-200 bg-gray-50 opacity-70" : "border-teal-200 bg-teal-50"}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Founding Host</h2>
                {hostFull && <Badge className="bg-red-100 text-red-700 border-0 text-xs">Fully Claimed</Badge>}
              </div>
            </div>
            <p className="text-gray-700 mb-2">
              Reserve your founding host spot and get <strong>£10 off your monthly subscription — forever.</strong>
            </p>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              {["No commission on bookings", "Direct payments to your account", "Full calendar & messaging tools", "Permanent £10/month discount"].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <SpotsCounter used={hostCount} limit={HOST_LIMIT} color="teal" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl border-2 p-8 ${cleanerFull ? "border-gray-200 bg-gray-50 opacity-70" : "border-blue-200 bg-blue-50"}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Founding Cleaner</h2>
                {cleanerFull && <Badge className="bg-red-100 text-red-700 border-0 text-xs">Fully Claimed</Badge>}
              </div>
            </div>
            <p className="text-gray-700 mb-2">
              Reserve your founding cleaner spot and get <strong>3 months free membership.</strong>
            </p>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              {["Keep 100% of what you earn", "Professional cleaner profile", "Direct jobs from local hosts", "3 months completely free"].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <SpotsCounter used={cleanerCount} limit={CLEANER_LIMIT} color="blue" />
          </motion.div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border-2 border-gray-100 shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Claim My Spot</h2>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <Input
                  value={form.full_name}
                  onChange={e => field("full_name", e.target.value)}
                  placeholder="Jane Smith"
                  className={errors.full_name ? "border-red-400" : ""}
                />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => field("email", e.target.value)}
                  placeholder="jane@example.com"
                  className={errors.email ? "border-red-400" : ""}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property / Home Postcode</label>
                <Input
                  value={form.postcode}
                  onChange={e => { field("postcode", e.target.value); setCornwallWarning(false); }}
                  onBlur={handlePostcodeBlur}
                  placeholder="e.g. TR1 2AB"
                  className={errors.postcode || cornwallWarning ? "border-amber-400" : ""}
                />
                {errors.postcode && <p className="text-red-500 text-xs mt-1">{errors.postcode}</p>}
                {cornwallWarning && !errors.postcode && (
                  <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>HostKeep is currently launching in Cornwall only. Join our waitlist to be notified when we expand to your area.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "host", label: "Host", Icon: Home, disabled: hostFull, color: "teal" },
                    { value: "cleaner", label: "Cleaner", Icon: Users, disabled: cleanerFull, color: "blue" },
                  ].map(({ value, label, Icon, disabled, color }) => (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && field("role", value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                        ${disabled ? "opacity-40 cursor-not-allowed border-gray-200 bg-gray-50" :
                          form.role === value
                            ? color === "teal" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                        }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{label}{disabled ? " (Full)" : ""}</span>
                    </button>
                  ))}
                </div>
                {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white text-base font-semibold"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                  : isOutOfArea ? "Register Your Interest" : "Claim My Spot"
                }
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}