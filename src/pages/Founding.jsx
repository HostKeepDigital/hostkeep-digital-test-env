import { useState, useEffect } from "react";
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
    role: "",
    postcode: "",
    terms: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.entities.FoundingMember.list().then(setMembers).finally(() => setLoading(false));
  }, []);

  const cornwallMembers = members.filter(m => m.approval_status !== "out_of_area");
  const hostCount = cornwallMembers.filter(m => m.role === "host").length;
  const cleanerCount = cornwallMembers.filter(m => m.role === "cleaner").length;
  const hostFull = hostCount >= HOST_LIMIT;
  const cleanerFull = cleanerCount >= CLEANER_LIMIT;

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "A valid email is required.";
    if (!form.role) e.role = "Please select a role.";
    if (!form.postcode.trim()) e.postcode = "Postcode is required.";
    if (!form.terms) e.terms = "You must agree to the terms and conditions.";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const outOfArea = !isCornwallPostcode(form.postcode);

    setSubmitting(true);
    try {
      // Duplicate check
      const existing = await base44.entities.FoundingMember.filter({ email: form.email.toLowerCase().trim() });
      if (existing && existing.length > 0) {
        setErrors({ email: "This email address has already been registered. If you have not received a confirmation email please check your spam folder or contact us at Hello@hostkeepdigital.co.uk" });
        return;
      }

      const firstName = form.full_name.split(' ')[0];

      if (outOfArea) {
        // Store as out_of_area
        await base44.entities.FoundingMember.create({
          full_name: form.full_name,
          email: form.email.toLowerCase().trim(),
          role: form.role,
          postcode: form.postcode.toUpperCase(),
          signup_timestamp: new Date().toISOString(),
          approval_status: "out_of_area",
        });

        await base44.integrations.Core.SendEmail({
          from_name: 'HostKeep Digital',
          to: form.email,
          subject: "We're not in your area yet — but we're coming 🌊",
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
            <p style="margin:0 0 16px;">Thank you for your interest in <strong>HostKeep Digital</strong>.</p>
            <p style="margin:0 0 16px;">We are currently launching in Cornwall in Summer 2026, but we are expanding UK-wide throughout 2027. We have registered your interest and will be in touch as soon as we launch in your area.</p>
            <p style="margin:0 0 8px;">Follow us for updates:</p>
            <p style="margin:0 0 24px;">
              <a href="https://www.facebook.com/HostKeepDigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook" width="32" height="32" style="display:inline-block;" /></a>
              <a href="https://www.instagram.com/hostkeepdigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" width="32" height="32" style="display:inline-block;" /></a>
            </p>
            <p style="margin:0 0 4px;">The HostKeep Team</p>
            <p style="margin:0;color:#0F766E;">Hello@hostkeepdigital.co.uk</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eeeeee;padding:20px 40px;text-align:center;color:#999999;font-size:12px;line-height:1.8;">
            HostKeep Digital Ltd | You received this because you registered your interest with HostKeep Digital.<br>
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
      } else {
        // Cornwall — founding member application
        if (form.role === "host" && hostFull) { navigate("/waitlist"); return; }
        if (form.role === "cleaner" && cleanerFull) { navigate("/waitlist"); return; }

        await base44.entities.FoundingMember.create({
          full_name: form.full_name,
          email: form.email.toLowerCase().trim(),
          role: form.role,
          postcode: form.postcode.toUpperCase(),
          signup_timestamp: new Date().toISOString(),
          approval_status: "pending",
        });

        await base44.integrations.Core.SendEmail({
          from_name: 'HostKeep Digital',
          to: form.email,
          subject: 'Thanks for applying — HostKeep Digital Founding Operator Programme 🌊',
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
            <p style="margin:0 0 16px;">Thank you for applying to become a founding operator on <strong>HostKeep Digital</strong>.</p>
            <p style="margin:0 0 16px;">We have received your application and our team is reviewing it. Founding spots are limited to 50 operators for our Cornwall launch, and we are working through applications carefully.</p>
            <p style="margin:0 0 24px;">If your spot is confirmed, you will receive a second email from us with everything you need to know.</p>
            <p style="margin:0 0 8px;">In the meantime, follow us for updates on our Cornwall launch:</p>
            <p style="margin:0 0 24px;">
              <a href="https://www.facebook.com/HostKeepDigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook" width="32" height="32" style="display:inline-block;" /></a>
              <a href="https://www.instagram.com/hostkeepdigital/" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" width="32" height="32" style="display:inline-block;" /></a>
            </p>
            <p style="margin:0 0 4px;">The HostKeep Team</p>
            <p style="margin:0;color:#0F766E;">Hello@hostkeepdigital.co.uk</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eeeeee;padding:20px 40px;text-align:center;color:#999999;font-size:12px;line-height:1.8;">
            HostKeep Digital Ltd | You received this because you applied for a founding operator spot.<br>
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
      }

      navigate("/founding-thankyou");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));

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
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1920')] bg-cover bg-center opacity-15" />
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
          {/* Host card */}
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

          {/* Cleaner card */}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "host", label: "Host", icon: Home, disabled: hostFull, color: "teal" },
                      { value: "cleaner", label: "Cleaner", icon: Users, disabled: cleanerFull, color: "blue" },
                    ].map(({ value, label, icon: Icon, disabled, color }) => (
                      <button
                        key={value}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && field("role", value)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                          ${disabled ? "opacity-40 cursor-not-allowed border-gray-200 bg-gray-50" :
                            form.role === value
                              ? `border-${color}-500 bg-${color}-50 text-${color}-700`
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
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.terms}
                      onChange={e => field("terms", e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600"
                    />
                    <span className="text-sm text-gray-600">
                      I agree to the{" "}
                      <a href="/TermsAndConditions" target="_blank" className="text-teal-600 underline">Terms and Conditions</a>
                      {" "}and understand this reserves my spot pending approval — no payment is taken today.
                    </span>
                  </label>
                  {errors.terms && <p className="text-red-500 text-xs mt-1">{errors.terms}</p>}
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