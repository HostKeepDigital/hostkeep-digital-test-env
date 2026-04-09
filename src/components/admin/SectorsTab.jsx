import { useState, useEffect, useRef } from "react";

const SECTOR_MAP_COLORS = {
  live:     "#1E3A5F",
  ready:    "#0d9488",
  building: "#f59e0b",
  waiting:  "#94a3b8",
  phase3:   "#e2e8f0",
};

const SectorBadge = ({ status }) => {
  const m = {
    live:     { bg:"bg-[#1E3A5F]", t:"text-white",       l:"Live"          },
    ready:    { bg:"bg-teal-100",  t:"text-teal-800",    l:"Ready to Open" },
    building: { bg:"bg-amber-100", t:"text-amber-800",   l:"Building"      },
    waiting:  { bg:"bg-gray-100",  t:"text-gray-500",    l:"Waiting"       },
    phase3:   { bg:"bg-slate-100", t:"text-slate-500",   l:"Phase 3"       },
  }[status] || { bg:"bg-gray-100", t:"text-gray-500", l:status };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.bg} ${m.t}`}>{m.l}</span>;
};

function UKMapWithPins({ sectorData, memberPins }) {
  const ref     = useRef(null);
  const [ready, setReady] = useState(false);
  const [err,   setErr  ] = useState(false);

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
    if (!ready || !ref.current) return;
    const d3   = window.d3;
    const topo = window.topojson;
    const el   = ref.current;
    const W    = el.clientWidth  || 460;
    const H    = el.clientHeight || 520;

    d3.select(el).selectAll("svg").remove();

    const svg = d3.select(el).append("svg")
      .attr("width", W).attr("height", H)
      .style("display", "block")
      .style("position", "absolute")
      .style("top", 0).style("left", 0);

    // Calibrated to match the UK map background image
    // Image spans roughly: lng -8.2 to 2.0, lat 49.8 to 60.9
    const proj = d3.geoMercator()
      .center([-3.1, 54.8])
      .scale(W * 3.05)
      .translate([W * 0.52, H * 0.50]);

    const path = d3.geoPath().projection(proj);

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

        // Real member postcode pins
        (memberPins || []).forEach(p => {
          const c = proj([p.lng, p.lat]);
          if (!c || c[0] < 0 || c[1] < 0 || c[0] > W || c[1] > H) return;
          const g = svg.append("g");
          // Glow ring
          g.append("circle")
            .attr("cx", c[0]).attr("cy", c[1]).attr("r", 7)
            .attr("fill", "#e11d48").attr("fill-opacity", 0.15)
            .attr("stroke", "none");
          // Pin dot
          g.append("circle")
            .attr("cx", c[0]).attr("cy", c[1]).attr("r", 3.5)
            .attr("fill", "#e11d48")
            .attr("fill-opacity", 0.92)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);
          if (p.name) g.append("title").text(p.name);
        });

        // Sector centre markers
        (sectorData || []).forEach(s => {
          if (!s.lat || !s.lng) return;
          const c = proj([s.lng, s.lat]);
          if (!c || c[0] < 0 || c[1] < 0 || c[0] > W || c[1] > H) return;
          const col = SECTOR_MAP_COLORS[s.computedStatus] || "#94a3b8";
          const g   = svg.append("g").style("cursor", "pointer");

          g.append("circle")
            .attr("cx", c[0]+1).attr("cy", c[1]+1).attr("r", 11)
            .attr("fill", "rgba(0,0,0,0.25)").attr("stroke", "none");

          g.append("circle")
            .attr("cx", c[0]).attr("cy", c[1]).attr("r", 10)
            .attr("fill", col)
            .attr("fill-opacity", s.computedStatus === "live" ? 1 : s.computedStatus === "phase3" ? 0.4 : 0.85)
            .attr("stroke", "#fff").attr("stroke-width", 2);

          const total = s.hosts + s.cleaners;
          if (total > 0) {
            g.append("text")
              .attr("x", c[0]).attr("y", c[1])
              .attr("text-anchor", "middle").attr("dominant-baseline", "central")
              .attr("font-size", "8").attr("font-weight", "bold").attr("fill", "#fff")
              .text(total);
          }

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
  }, [ready, sectorData, memberPins]);

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
      <div className="flex flex-wrap gap-3 pt-3 mt-3 border-t border-white/20">
        {[
          { c:"#1E3A5F", l:"Live" },
          { c:"#0d9488", l:"Ready" },
          { c:"#f59e0b", l:"Building" },
          { c:"#94a3b8", l:"Waiting" },
          { c:"#e11d48", l:"Member" },
        ].map(({ c, l }) => (
          <span key={l} className="flex items-center gap-1.5 text-xs text-white/70">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// Bulk-geocode an array of postcodes via postcodes.io (max 100 per call)
async function geocodePostcodes(postcodes) {
  const unique = [...new Set(postcodes.filter(Boolean).map(p => p.trim().toUpperCase()))];
  if (!unique.length) return {};
  const results = {};
  // Chunk into batches of 100
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    const res = await fetch("https://api.postcodes.io/postcodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcodes: batch }),
    });
    const json = await res.json();
    if (json.result) {
      json.result.forEach(r => {
        if (r.result) results[r.query] = { lat: r.result.latitude, lng: r.result.longitude };
      });
    }
  }
  return results;
}

export default function SectorsTab({ sectorData, members }) {
  const [memberPins, setMemberPins] = useState([]);
  const [geocoding,  setGeocoding ] = useState(false);

  useEffect(() => {
    if (!members?.length) return;
    const postcodes = members.map(m => m.postcode).filter(Boolean);
    if (!postcodes.length) return;

    setGeocoding(true);
    geocodePostcodes(postcodes).then(coords => {
      const pins = members
        .filter(m => m.postcode && coords[m.postcode?.trim()?.toUpperCase()])
        .map(m => {
          const c = coords[m.postcode.trim().toUpperCase()];
          return { lat: c.lat, lng: c.lng, name: `${m.full_name} (${m.role}) — ${m.postcode}` };
        });
      setMemberPins(pins);
      setGeocoding(false);
    }).catch(() => setGeocoding(false));
  }, [members]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Map */}
        <div className="bg-[#1E3A5F] rounded-2xl p-6 flex flex-col" style={{ minHeight: 680 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">UK Sector Map</h2>
            <div className="flex items-center gap-2">
              {geocoding && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />}
              <span className="text-xs text-white/50">{memberPins.length} member pin{memberPins.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 560 }}>
            <UKMapWithPins sectorData={sectorData} memberPins={memberPins} />
          </div>
        </div>

        {/* Sector table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sector Status</h2>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 500 }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Sector","Postcodes","Hosts","Cleaners","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sectorData.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 text-xs">{s.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{s.postcodes.slice(0,3).join(", ")}{s.postcodes.length > 3 ? "…" : ""}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${s.hosts >= s.maxH ? "text-green-600" : s.hosts > 0 ? "text-amber-600" : "text-gray-300"}`}>
                        {s.hosts}/{s.maxH}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${s.cleaners >= s.maxC ? "text-green-600" : s.cleaners > 0 ? "text-amber-600" : "text-gray-300"}`}>
                        {s.cleaners}/{s.maxC}
                      </span>
                    </td>
                    <td className="px-4 py-3"><SectorBadge status={s.computedStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}