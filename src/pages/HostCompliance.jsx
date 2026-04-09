import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Shield,
  Upload,
  ChevronRight,
  Info,
  ExternalLink,
  Building2,
  Zap,
  Flame,
} from "lucide-react";
import { format, differenceInDays, parseISO, isValid } from "date-fns";

function daysBetween(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return differenceInDays(d, new Date());
}

function DocStatus({ label, expiryDate, docUrl, icon: Icon }) {
  const days = daysBetween(expiryDate);
  const hasDoc = !!docUrl;

  let status = "missing";
  let color = "text-red-600";
  let bg = "bg-red-50 border-red-200";
  let badgeColor = "bg-red-100 text-red-700";
  let statusText = "Missing";

  if (expiryDate) {
    if (days === null) {
      status = "missing";
    } else if (days < 0) {
      status = "expired";
      color = "text-red-600";
      bg = "bg-red-50 border-red-200";
      badgeColor = "bg-red-100 text-red-700";
      statusText = "Expired";
    } else if (days <= 30) {
      status = "expiring";
      color = "text-amber-600";
      bg = "bg-amber-50 border-amber-200";
      badgeColor = "bg-amber-100 text-amber-700";
      statusText = `Expires in ${days}d`;
    } else {
      status = "valid";
      color = "text-emerald-600";
      bg = "bg-emerald-50 border-emerald-200";
      badgeColor = "bg-emerald-100 text-emerald-700";
      statusText = `Valid until ${format(parseISO(expiryDate), "d MMM yyyy")}`;
    }
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${bg}`}>
      <div className={`${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className={`text-xs ${color} font-medium`}>{statusText}</p>
      </div>
      {hasDoc && (
        <a
          href={docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:text-teal-700"
          title="View document"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

function RegistrationBadge({ status, number }) {
  const map = {
    registered: { label: "Registered", cls: "bg-emerald-100 text-emerald-700" },
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    expired: { label: "Expired", cls: "bg-red-100 text-red-700" },
    exempt: { label: "Exempt", cls: "bg-blue-100 text-blue-700" },
  };
  const { label, cls } = map[status] || { label: "Unknown", cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
      {number && <span className="font-mono opacity-75 ml-1">{number}</span>}
    </span>
  );
}

function complianceScore(compliance) {
  if (!compliance) return 0;
  let score = 0;
  if (compliance.registration_status === "registered" || compliance.registration_status === "exempt") score += 25;
  const gasDays = daysBetween(compliance.gas_safety_cert_expiry);
  if (gasDays !== null && gasDays >= 0) score += 25;
  const eicrDays = daysBetween(compliance.eicr_expiry);
  if (eicrDays !== null && eicrDays >= 0) score += 25;
  if (compliance.fire_risk_assessment_date) score += 25;
  return score;
}

export default function HostCompliance() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [complianceMap, setComplianceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingProperty, setEditingProperty] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const [props, complianceRecords] = await Promise.all([
      base44.entities.Property.filter({ owner_id: user.id }),
      base44.entities.PropertyCompliance.filter({ host_id: user.id }),
    ]);
    setProperties(props);
    const map = {};
    complianceRecords.forEach((c) => { map[c.property_id] = c; });
    setComplianceMap(map);
    setLoading(false);
  }

  function openEdit(property) {
    const existing = complianceMap[property.id] || {};
    setForm({
      registration_number: existing.registration_number || "",
      registration_status: existing.registration_status || "pending",
      registration_expiry: existing.registration_expiry || "",
      gas_safety_cert_expiry: existing.gas_safety_cert_expiry || "",
      gas_safety_cert_url: existing.gas_safety_cert_url || "",
      eicr_expiry: existing.eicr_expiry || "",
      eicr_url: existing.eicr_url || "",
      fire_risk_assessment_date: existing.fire_risk_assessment_date || "",
      fire_risk_assessment_url: existing.fire_risk_assessment_url || "",
      notes: existing.notes || "",
    });
    setEditingProperty(property);
  }

  async function handleUpload(field, file) {
    setUploadingField(field);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, [field]: file_url }));
    setUploadingField(null);
  }

  async function handleSave() {
    setSaving(true);
    const existing = complianceMap[editingProperty.id];
    const payload = {
      ...form,
      property_id: editingProperty.id,
      host_id: user.id,
    };
    // Strip empty strings to avoid bad date parsing
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") delete payload[k];
    });

    if (existing?.id) {
      await base44.entities.PropertyCompliance.update(existing.id, payload);
    } else {
      await base44.entities.PropertyCompliance.create(payload);
    }
    await loadData();
    setSaving(false);
    setEditingProperty(null);
  }

  const overallStats = {
    total: properties.length,
    fullyCompliant: properties.filter((p) => complianceScore(complianceMap[p.id]) === 100).length,
    registered: properties.filter((p) => ["registered", "exempt"].includes(complianceMap[p.id]?.registration_status)).length,
    issues: properties.filter((p) => {
      const c = complianceMap[p.id];
      if (!c) return true;
      const score = complianceScore(c);
      return score < 100;
    }).length,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance Centre</h1>
            <p className="text-sm text-gray-500">UK Short-Term Rental Registration & Safety</p>
          </div>
        </div>
      </div>

      {/* UK STR Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">UK Short-Term Rental Registration Scheme (2026)</p>
          <p className="text-blue-700">
            A mandatory national registration scheme is active from April 2026. All short-term lets in England must
            have a registration number to be legally advertised. Non-compliance carries fines of{" "}
            <strong>£2,500–£5,000</strong> for first offences. Income is now treated as standard property business
            income (FHL regime abolished April 2025).
          </p>
        </div>
      </div>

      {/* Stats Row */}
      {!loading && properties.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Properties", value: overallStats.total, color: "text-gray-700" },
            { label: "Registered", value: overallStats.registered, color: "text-emerald-600" },
            { label: "Fully Compliant", value: overallStats.fullyCompliant, color: "text-teal-600" },
            { label: "Need Attention", value: overallStats.issues, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Property Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No properties found</p>
          <p className="text-sm mt-1">Add a property first to manage compliance.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => {
            const compliance = complianceMap[property.id];
            const score = complianceScore(compliance);
            const scoreColor =
              score === 100 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
            const barColor =
              score === 100 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

            return (
              <div
                key={property.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {[property.town, property.county].filter(Boolean).join(", ")}
                      </p>
                      <div className="mt-2">
                        <RegistrationBadge
                          status={compliance?.registration_status || "pending"}
                          number={compliance?.registration_number}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-2xl font-bold ${scoreColor}`}>{score}%</p>
                      <p className="text-xs text-gray-400">Compliance</p>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                    <div
                      className={`h-1.5 rounded-full transition-all ${barColor}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>

                  {/* Doc statuses */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                    <DocStatus
                      label="Gas Safety Cert"
                      expiryDate={compliance?.gas_safety_cert_expiry}
                      docUrl={compliance?.gas_safety_cert_url}
                      icon={Flame}
                    />
                    <DocStatus
                      label="EICR"
                      expiryDate={compliance?.eicr_expiry}
                      docUrl={compliance?.eicr_url}
                      icon={Zap}
                    />
                    <DocStatus
                      label="Fire Risk Assessment"
                      expiryDate={compliance?.fire_risk_assessment_date}
                      docUrl={compliance?.fire_risk_assessment_url}
                      icon={FileText}
                    />
                  </div>

                  <Button
                    onClick={() => openEdit(property)}
                    variant="outline"
                    size="sm"
                    className="w-full text-sm border-teal-200 text-teal-700 hover:bg-teal-50"
                  >
                    Update Compliance Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingProperty} onOpenChange={(o) => !o && setEditingProperty(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              {editingProperty?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Registration */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">STR Registration</h4>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. ENG-STR-2026-XXXXXX"
                  value={form.registration_number || ""}
                  onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                  <select
                    value={form.registration_status || "pending"}
                    onChange={(e) => setForm((f) => ({ ...f, registration_status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="registered">Registered</option>
                    <option value="expired">Expired</option>
                    <option value="exempt">Exempt</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.registration_expiry || ""}
                    onChange={(e) => setForm((f) => ({ ...f, registration_expiry: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Gas Safety */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> Gas Safety Certificate
                <span className="text-xs font-normal text-gray-400">(Annual)</span>
              </h4>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={form.gas_safety_cert_expiry || ""}
                  onChange={(e) => setForm((f) => ({ ...f, gas_safety_cert_expiry: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <UploadField
                label="Certificate Document"
                url={form.gas_safety_cert_url}
                uploading={uploadingField === "gas_safety_cert_url"}
                onUpload={(file) => handleUpload("gas_safety_cert_url", file)}
              />
            </div>

            {/* EICR */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> EICR
                <span className="text-xs font-normal text-gray-400">(5-Year)</span>
              </h4>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={form.eicr_expiry || ""}
                  onChange={(e) => setForm((f) => ({ ...f, eicr_expiry: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <UploadField
                label="EICR Document"
                url={form.eicr_url}
                uploading={uploadingField === "eicr_url"}
                onUpload={(file) => handleUpload("eicr_url", file)}
              />
            </div>

            {/* Fire Risk */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-500" /> Fire Risk Assessment
              </h4>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Assessment Date</label>
                <input
                  type="date"
                  value={form.fire_risk_assessment_date || ""}
                  onChange={(e) => setForm((f) => ({ ...f, fire_risk_assessment_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <UploadField
                label="Assessment Document"
                url={form.fire_risk_assessment_url}
                uploading={uploadingField === "fire_risk_assessment_url"}
                onUpload={(file) => handleUpload("fire_risk_assessment_url", file)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Internal Notes</label>
              <textarea
                rows={2}
                placeholder="Any additional compliance notes..."
                value={form.notes || ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? "Saving..." : "Save Compliance Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadField({ label, url, uploading, onUpload }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium hover:bg-emerald-100 truncate"
          >
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            View uploaded document
            <ExternalLink className="w-3 h-3 flex-shrink-0 ml-auto" />
          </a>
        ) : (
          <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-400">
            No document uploaded
          </span>
        )}
        <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">
          {uploading ? (
            <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? "Uploading..." : "Upload"}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
      </div>
    </div>
  );
}