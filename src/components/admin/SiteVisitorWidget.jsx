import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const RANGES = [
  { label: "24h",  hours: 24,   bucket: "hour"  },
  { label: "48h",  hours: 48,   bucket: "day"   },
  { label: "72h",  hours: 72,   bucket: "day"   },
  { label: "1w",   hours: 168,  bucket: "day"   },
  { label: "2w",   hours: 336,  bucket: "day"   },
  { label: "1m",   hours: 720,  bucket: "day"   },
  { label: "3m",   hours: 2160, bucket: "week"  },
];

export default function SiteVisitorWidget() {
  const [rangeIdx, setRangeIdx] = useState(0);
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);

  const range = RANGES[rangeIdx];

  useEffect(() => {
    setLoading(true);
    base44.entities.PageView.list("-timestamp", 5000)
      .then(data => { setViews(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cutoff = new Date(Date.now() - range.hours * 60 * 60 * 1000);
  const inRange = views.filter(v => v.timestamp && new Date(v.timestamp) >= cutoff);
  const uniqueVisitors = new Set(inRange.map(v => v.visitor_id)).size;

  const buckets = [];
  if (range.bucket === "hour") {
    for (let i = range.hours - 1; i >= 0; i--) {
      const start = new Date(Date.now() - (i + 1) * 60 * 60 * 1000);
      const end   = new Date(Date.now() - i * 60 * 60 * 1000);
      const ids   = new Set(views.filter(v => { const t = new Date(v.timestamp); return t >= start && t < end; }).map(v => v.visitor_id));
      buckets.push({ label: `${end.getHours()}:00`, count: ids.size });
    }
  } else if (range.bucket === "day") {
    const days = range.hours / 24;
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
      const end   = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const ids   = new Set(views.filter(v => { const t = new Date(v.timestamp); return t >= start && t < end; }).map(v => v.visitor_id));
      const d     = new Date(end); d.setDate(d.getDate() - 1);
      buckets.push({ label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), count: ids.size });
    }
  } else {
    const weeks = range.hours / 168;
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end   = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const ids   = new Set(views.filter(v => { const t = new Date(v.timestamp); return t >= start && t < end; }).map(v => v.visitor_id));
      buckets.push({ label: `w/e ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, count: ids.size });
    }
  }

  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const labelEvery = buckets.length <= 7 ? 1 : buckets.length <= 24 ? 4 : 7;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Site Visitors — Home Page</h2>
          <p className="text-xs text-gray-400 mt-0.5">Unique browsers landing on the home page</p>
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${rangeIdx === i ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-2 mb-6">
        <p className="text-4xl font-bold text-[#1E3A5F]">{loading ? "—" : uniqueVisitors}</p>
        <p className="text-sm text-gray-400 mb-1.5">unique visitors</p>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-xs text-gray-300">Loading...</div>
      ) : (
        <div className="flex items-end gap-px h-32 w-full overflow-hidden">
          {buckets.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
              <div
                className="w-full bg-[#0d9488] rounded-t transition-all duration-300 hover:bg-[#0f766e] min-h-[2px]"
                style={{ height: `${Math.max(2, (b.count / maxCount) * 100)}%` }}
              />
              {i % labelEvery === 0 && (
                <span className="text-[9px] text-gray-400 rotate-45 origin-left mt-1 whitespace-nowrap absolute -bottom-5 left-0">
                  {b.label}
                </span>
              )}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {b.count}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8" />
    </div>
  );
}