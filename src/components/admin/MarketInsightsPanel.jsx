import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

const PROPERTY_TYPES = ["all", "cottage", "apartment", "lodge", "chalet", "cabin", "house", "bungalow", "caravan"];

const UK_SECTORS = [
  { id: "cornwall",         label: "Cornwall & Isles of Scilly",          postcode_area: "TR", county: "Cornwall" },
  { id: "devon",            label: "Devon",                               postcode_area: "EX", county: "Devon" },
  { id: "dorset",           label: "Dorset",                              postcode_area: "DT", county: "Dorset" },
  { id: "somerset",         label: "Somerset",                            postcode_area: "TA", county: "Somerset" },
  { id: "bristol",          label: "Bristol & Bath",                      postcode_area: "BS", county: "Bristol" },
  { id: "wiltshire",        label: "Wiltshire & Gloucestershire",         postcode_area: "SN", county: "Wiltshire" },
  { id: "hampshire",        label: "Hampshire & Isle of Wight",           postcode_area: "SO", county: "Hampshire" },
  { id: "sussex",           label: "Sussex",                              postcode_area: "BN", county: "Sussex" },
  { id: "kent",             label: "Kent",                                postcode_area: "CT", county: "Kent" },
  { id: "surrey",           label: "Surrey & Berkshire",                  postcode_area: "GU", county: "Surrey" },
  { id: "london",           label: "Greater London",                      postcode_area: "SW", county: "London" },
  { id: "essex",            label: "Essex & Hertfordshire",               postcode_area: "CM", county: "Essex" },
  { id: "oxfordshire",      label: "Oxfordshire & Buckinghamshire",       postcode_area: "OX", county: "Oxfordshire" },
  { id: "norfolk",          label: "Norfolk",                             postcode_area: "NR", county: "Norfolk" },
  { id: "suffolk",          label: "Suffolk & Cambridgeshire",            postcode_area: "IP", county: "Suffolk" },
  { id: "lincolnshire",     label: "Lincolnshire",                        postcode_area: "LN", county: "Lincolnshire" },
  { id: "east-midlands",    label: "East Midlands",                       postcode_area: "LE", county: "Leicestershire" },
  { id: "west-midlands",    label: "West Midlands & Warwickshire",        postcode_area: "B",  county: "West Midlands" },
  { id: "northamptonshire", label: "Northamptonshire",                    postcode_area: "NN", county: "Northamptonshire" },
  { id: "cheshire",         label: "Cheshire & North Shropshire",         postcode_area: "CH", county: "Cheshire" },
  { id: "manchester",       label: "Greater Manchester",                  postcode_area: "M",  county: "Greater Manchester" },
  { id: "lancashire",       label: "Lancashire & Blackpool",              postcode_area: "PR", county: "Lancashire" },
  { id: "cumbria",          label: "Cumbria & Lake District",             postcode_area: "CA", county: "Cumbria" },
  { id: "yorkshire-east",   label: "East Yorkshire & Coast",              postcode_area: "HU", county: "East Yorkshire" },
  { id: "yorkshire",        label: "Yorkshire (Leeds / York / Harrogate)",postcode_area: "LS", county: "Yorkshire" },
  { id: "north-yorkshire",  label: "North Yorkshire & Moors",             postcode_area: "YO", county: "North Yorkshire" },
  { id: "peak-district",    label: "Peak District & Derbyshire",          postcode_area: "DE", county: "Derbyshire" },
  { id: "north-east",       label: "North East England & Northumberland", postcode_area: "NE", county: "Northumberland" },
  { id: "durham",           label: "County Durham & Teesside",            postcode_area: "DH", county: "County Durham" },
  { id: "north-wales",      label: "North Wales & Snowdonia",             postcode_area: "LL", county: "Gwynedd" },
  { id: "mid-wales",        label: "Mid Wales & Pembrokeshire",           postcode_area: "SA", county: "Pembrokeshire" },
  { id: "south-wales",      label: "South Wales & Cardiff",               postcode_area: "CF", county: "South Wales" },
  { id: "scottish-borders", label: "Scottish Borders",                    postcode_area: "TD", county: "Scottish Borders" },
  { id: "edinburgh",        label: "Edinburgh & Lothians",                postcode_area: "EH", county: "Edinburgh" },
  { id: "glasgow",          label: "Glasgow & Clyde Valley",              postcode_area: "G",  county: "Glasgow" },
  { id: "argyll",           label: "Argyll, Loch Lomond & Trossachs",     postcode_area: "PA", county: "Argyll" },
  { id: "tayside",          label: "Tayside, Perthshire & Dundee",        postcode_area: "PH", county: "Perthshire" },
  { id: "aberdeen",         label: "Aberdeen & Aberdeenshire",            postcode_area: "AB", county: "Aberdeenshire" },
  { id: "highlands",        label: "Highlands & Inverness",               postcode_area: "IV", county: "Highlands" },
  { id: "far-north",        label: "Far North Scotland & Caithness",      postcode_area: "KW", county: "Caithness" },
  { id: "western-isles",    label: "Western Isles & Hebrides",            postcode_area: "HS", county: "Western Isles" },
  { id: "orkney-shetland",  label: "Orkney & Shetland",                   postcode_area: "ZE", county: "Shetland" },
  { id: "northern-ireland", label: "Northern Ireland",                    postcode_area: "BT", county: "Northern Ireland" },
];

function InsightBadge({ text }) {
  const isPositive = /increas|premium|high demand|strong|popular|above/i.test(text);
  const isNegative = /declin|low demand|weak|below|slow|caution/i.test(text);
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs ${
      isPositive ? "bg-teal-50 text-teal-800 border border-teal-100"
      : isNegative ? "bg-red-50 text-red-700 border border-red-100"
      : "bg-gray-50 text-gray-700 border border-gray-100"
    }`}>
      {isPositive ? <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        : isNegative ? <TrendingDown className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        : <Minus className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
      {text}
    </div>
  );
}

function MarketCard({ record, onRefresh }) {
  const ageHours = record.scraped_at
    ? Math.round((Date.now() - new Date(record.scraped_at)) / 3600000)
    : null;
  const isOld = ageHours != null && ageHours > 24 * 30;

  return (
    <div className={`bg-white rounded-xl border p-5 space-y-4 ${record.is_stale ? "opacity-60 border-gray-100" : "border-gray-200"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">
              {record.bedrooms ? `${record.bedrooms}-bed ` : ""}{record.property_type}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 font-medium">
              {record.town || record.postcode_area}
              {record.county ? `, ${record.county}` : ""}
            </span>
            {record.is_stale && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Superseded</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {record.sample_size ? `${record.sample_size} listings analysed · ` : ""}
            {ageHours != null ? (ageHours < 1 ? "Just updated" : ageHours < 24 ? `${ageHours}h ago` : `${Math.round(ageHours/24)}d ago`) : ""}
            {isOld && " — ⚠️ may be stale"}
          </p>
        </div>
        {onRefresh && !record.is_stale && (
          <button onClick={() => onRefresh(record)} className="text-xs text-gray-400 hover:text-teal-600 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        )}
      </div>

      {/* Rate grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Avg Nightly Rate",   value: `£${record.avg_nightly_rate?.toFixed(0)}`,    highlight: true },
          { label: "Median",             value: `£${record.median_nightly_rate?.toFixed(0)}` },
          { label: "Range",              value: `£${record.min_nightly_rate?.toFixed(0)} – £${record.max_nightly_rate?.toFixed(0)}` },
          { label: "Est. Occupancy",     value: record.avg_occupancy_rate ? `${record.avg_occupancy_rate}%` : "—" },
        ].map(m => (
          <div key={m.label} className={`rounded-lg p-3 text-center ${m.highlight ? "bg-teal-50" : "bg-gray-50"}`}>
            <p className={`text-lg font-bold leading-tight ${m.highlight ? "text-teal-700" : "text-gray-800"}`}>{m.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Seasonality */}
      <div className="flex flex-wrap gap-4 text-xs">
        {record.peak_months?.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Peak:</span>
            <div className="flex flex-wrap gap-1">
              {record.peak_months.map(m => (
                <span key={m} className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">{m}</span>
              ))}
            </div>
          </div>
        )}
        {record.low_months?.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Slow:</span>
            <div className="flex flex-wrap gap-1">
              {record.low_months.map(m => (
                <span key={m} className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{m}</span>
              ))}
            </div>
          </div>
        )}
        {record.weekend_premium_pct != null && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <span>Weekend premium:</span>
            <span className="font-semibold text-gray-700">+{record.weekend_premium_pct}%</span>
          </div>
        )}
      </div>

      {/* Insights */}
      {record.key_insights?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key Insights</p>
          {record.key_insights.map((ins, i) => <InsightBadge key={i} text={ins} />)}
        </div>
      )}

      {/* Positioning advice */}
      {record.positioning_advice && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">Pricing Strategy</p>
          <p className="text-xs text-blue-800 leading-relaxed">{record.positioning_advice}</p>
        </div>
      )}

      {/* Sources */}
      {record.data_sources?.length > 0 && (
        <p className="text-xs text-gray-400">Sources: {record.data_sources.join(", ")}</p>
      )}
    </div>
  );
}

export default function MarketInsightsPanel() {
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [scraping, setScraping]         = useState(false);
  const [selectedSector, setSelectedSector] = useState(UK_SECTORS[0].id);
  const [form, setForm]                 = useState({ postcode_area: UK_SECTORS[0].postcode_area, town: "", county: UK_SECTORS[0].county, property_type: "all", bedrooms: "" });

  const handleSectorChange = (sectorId) => {
    const sector = UK_SECTORS.find(s => s.id === sectorId);
    if (!sector) return;
    setSelectedSector(sectorId);
    setForm(p => ({ ...p, postcode_area: sector.postcode_area, county: sector.county, town: "" }));
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.MarketPricing.list("-created_date", 100);
      setRecords(data || []);
    } catch (_) { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await base44.functions.invoke("scrapeMarketPricing", {
        postcode_area: form.postcode_area,
        town: form.town || undefined,
        county: form.county || undefined,
        property_type: form.property_type === "all" ? "holiday let" : form.property_type,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      });
      if (res.data?.ok) {
        toast.success("Market data updated");
        await load();
      } else {
        toast.error(res.data?.error || "Scrape failed");
      }
    } catch (e) {
      toast.error(e.message);
    }
    setScraping(false);
  };

  const handleRefresh = async (record) => {
    setForm({
      postcode_area: record.postcode_area,
      town: record.town || "",
      county: record.county || "",
      property_type: record.property_type,
      bedrooms: record.bedrooms ? String(record.bedrooms) : "",
    });
    // Auto-trigger
    setScraping(true);
    try {
      const res = await base44.functions.invoke("scrapeMarketPricing", {
        postcode_area: record.postcode_area,
        town: record.town || undefined,
        county: record.county || undefined,
        property_type: record.property_type,
        bedrooms: record.bedrooms || undefined,
      });
      if (res.data?.ok) {
        toast.success("Market data refreshed");
        await load();
      } else {
        toast.error(res.data?.error || "Refresh failed");
      }
    } catch (e) { toast.error(e.message); }
    setScraping(false);
  };

  const activeRecords = records;

  return (
    <div className="space-y-6">
      {/* Scrape form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Analyse Competitor Market</h3>
          <p className="text-xs text-gray-400 mt-0.5">Searches Airbnb, Booking.com and comparable platforms for live competitor pricing in a specific area. Uses AI + web search — takes ~15s.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">UK Sector *</label>
            <select value={selectedSector} onChange={e => handleSectorChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm">
              {UK_SECTORS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Town <span className="text-gray-400">(optional)</span></label>
            <input value={form.town} onChange={e => setForm(p => ({ ...p, town: e.target.value }))}
              placeholder="e.g. Padstow" className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Property Type *</label>
            <select value={form.property_type} onChange={e => setForm(p => ({ ...p, property_type: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm">
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Bedrooms</label>
            <select value={form.bedrooms} onChange={e => setForm(p => ({ ...p, bedrooms: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm">
              <option value="">Any</option>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={handleScrape} disabled={scraping} className="bg-teal-600 hover:bg-teal-700 text-white gap-2 text-sm">
          <Search className="w-4 h-4" />
          {scraping ? "Researching market… (15–30s)" : "Run Market Analysis"}
        </Button>
        {scraping && (
          <p className="text-xs text-gray-400 animate-pulse">Searching Airbnb, Booking.com and comparable UK platforms via AI web search…</p>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : activeRecords.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-6 py-10 text-center">
          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No market data yet. Run your first analysis above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {activeRecords.length} Market{activeRecords.length !== 1 ? "s" : ""} Analysed
            </h3>
            <button onClick={load} className="text-xs text-gray-400 hover:text-teal-600 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Reload
            </button>
          </div>
          {activeRecords.map(r => <MarketCard key={r.id} record={r} onRefresh={handleRefresh} />)}
        </div>
      )}
    </div>
  );
}