import { useEffect, useRef, useState } from "react";

const SECTOR_STATUS_COLORS = {
  live:     "#1E3A5F",
  ready:    "#0d9488",
  building: "#f59e0b",
  waiting:  "#94a3b8",
  phase3:   "#cbd5e1",
};

export default function UKSectorsMap({ sectorData = [], members = [] }) {
  const mapRef  = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  // Load D3 + TopoJSON from CDN
  useEffect(() => {
    if (window.d3 && window.topojson) { setLoaded(true); return; }

    let d3Script, topoScript;

    const onTopoLoad = () => setLoaded(true);
    const onError    = () => setError(true);

    d3Script = document.createElement("script");
    d3Script.src = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js";
    d3Script.onload = () => {
      topoScript = document.createElement("script");
      topoScript.src = "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js";
      topoScript.onload  = onTopoLoad;
      topoScript.onerror = onError;
      document.head.appendChild(topoScript);
    };
    d3Script.onerror = onError;
    document.head.appendChild(d3Script);

    return () => {
      if (d3Script   && d3Script.parentNode)   d3Script.parentNode.removeChild(d3Script);
      if (topoScript && topoScript.parentNode) topoScript.parentNode.removeChild(topoScript);
    };
  }, []);

  // Render map
  useEffect(() => {
    if (!loaded || !mapRef.current || !sectorData.length) return;

    const d3   = window.d3;
    const topo = window.topojson;

    const container = mapRef.current;
    const W = container.clientWidth  || 300;
    const H = container.clientHeight || 560;

    d3.select(container).selectAll("*").remove();

    const svg = d3.select(container).append("svg")
      .attr("width", W).attr("height", H)
      .style("display", "block");

    const projection = d3.geoMercator()
      .center([-3.8, 55.0])
      .scale(W * 5.8)
      .translate([W * 0.52, H * 0.50]);

    const pathGen = d3.geoPath().projection(projection);

    const pins = sectorData.flatMap(s =>
      Array.from({ length: Math.max(1, Math.floor((s.hosts + s.cleaners) * 0.5)) }, () => ({
        lat: s.lat + (Math.random() - 0.5) * 0.9,
        lng: s.lng + (Math.random() - 0.5) * 1.3,
      }))
    );

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json")
      .then(world => {
        const countries = topo.feature(world, world.objects.countries);
        const uk      = countries.features.find(f => f.id === 826);
        const ireland = countries.features.find(f => f.id === 372);

        if (ireland) svg.append("path").datum(ireland)
          .attr("d", pathGen)
          .attr("fill", "#f1f5f9")
          .attr("stroke", "#e2e8f0")
          .attr("stroke-width", "0.5");

        if (uk) svg.append("path").datum(uk)
          .attr("d", pathGen)
          .attr("fill", "#dde4ec")
          .attr("stroke", "#94a3b8")
          .attr("stroke-width", "0.8");

        pins.forEach(p => {
          const coords = projection([p.lng, p.lat]);
          if (!coords || coords[0] < 0 || coords[1] < 0 || coords[0] > W || coords[1] > H) return;
          svg.append("circle")
            .attr("cx", coords[0]).attr("cy", coords[1]).attr("r", 2)
            .attr("fill", "#e11d48")
            .attr("fill-opacity", 0.65)
            .attr("stroke", "none");
        });

        sectorData.forEach(s => {
          if (!s.lat || !s.lng) return;
          const coords = projection([s.lng, s.lat]);
          if (!coords || coords[0] < 0 || coords[1] < 0 || coords[0] > W || coords[1] > H) return;

          const col = SECTOR_STATUS_COLORS[s.computedStatus] || "#94a3b8";
          const g   = svg.append("g").style("cursor", "pointer");

          g.append("circle")
            .attr("cx", coords[0]).attr("cy", coords[1]).attr("r", 9)
            .attr("fill", col)
            .attr("fill-opacity",
              s.computedStatus === "live" ? 1 :
              s.computedStatus === "phase3" ? 0.35 : 0.75
            )
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

          g.append("title").text(
            `${s.name}\nHosts: ${s.hosts}/${s.maxH} · Cleaners: ${s.cleaners}/${s.maxC}\n${s.computedStatus.charAt(0).toUpperCase() + s.computedStatus.slice(1)}`
          );
        });
      })
      .catch(() => {
        svg.append("text")
          .attr("x", W / 2).attr("y", H / 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "12")
          .attr("fill", "#9ca3af")
          .text("Map unavailable — check network");
      });
  }, [loaded, sectorData, members]);

  if (error) return (
    <div className="flex items-center justify-center h-full text-gray-300 text-sm">
      Map failed to load
    </div>
  );

  if (!loaded) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-[#1E3A5F] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div ref={mapRef} className="flex-1 w-full" />

      {/* ⭐ SCROLLABLE SECTOR LEGEND */}
      <div className="w-full overflow-x-auto pb-4 mt-2 border-t border-gray-100">
        <div className="flex gap-4 min-w-max py-3 px-1">
          {[
            { color: "#1E3A5F", label: "Live" },
            { color: "#0d9488", label: "Ready" },
            { color: "#f59e0b", label: "Building" },
            { color: "#94a3b8", label: "Waiting" },
            { color: "#e11d48", label: "Signup pin" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}