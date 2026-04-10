import { useState } from "react";

// Minimal UK sectors + longest-prefix sector resolver (mirrors AdminPanel)
const SECTORS = [
  { id:"cornwall",         postcodes:["TR"],                                                name:"Cornwall & Isles of Scilly" },
  { id:"devon",            postcodes:["PL","EX","TQ"],                                      name:"Devon & Torbay" },
  { id:"dorset",           postcodes:["DT","BH"],                                           name:"Dorset & Jurassic Coast" },
  { id:"somerset",         postcodes:["TA"],                                                name:"Somerset & Exmoor" },
  { id:"bristol",          postcodes:["BS","BA","SN","SP"],                                 name:"Bristol, Bath & Wiltshire" },
  { id:"hampshire",        postcodes:["SO","PO"],                                           name:"Hampshire & Isle of Wight" },
  { id:"sussex_kent",      postcodes:["BN","TN","CT","ME","DA","RH"],                       name:"Sussex, Kent & East Surrey" },
  { id:"surrey_berks",     postcodes:["GU","KT","RG","SL","TW","SM","CR","BR"],             name:"Surrey, Berkshire & Thames Valley" },
  { id:"london",           postcodes:["EC","WC","WD","SE","SW","NW","E","N","W","HA","UB","IG","RM","EN"], name:"Greater London" },
  { id:"essex_herts",      postcodes:["CM","CO","SS","SG","AL","LU","HP"],                  name:"Essex & Hertfordshire" },
  { id:"oxfordshire",      postcodes:["OX","MK"],                                           name:"Oxfordshire & Buckinghamshire" },
  { id:"cotswolds",        postcodes:["GL","HR","WR"],                                      name:"Cotswolds & Gloucestershire" },
  { id:"norfolk_suffolk",  postcodes:["NR","IP"],                                           name:"Norfolk & Suffolk Coast" },
  { id:"cambridge",        postcodes:["CB","PE"],                                           name:"Cambridge & The Fens" },
  { id:"lincolnshire",     postcodes:["LN","DN"],                                           name:"Lincolnshire Coast & Wolds" },
  { id:"east_midlands",    postcodes:["LE","NN","NG","DE","CV"],                            name:"East Midlands" },
  { id:"west_midlands",    postcodes:["B","WV","WS","DY","ST","TF"],                        name:"West Midlands & Black Country" },
  { id:"shropshire",       postcodes:["SY","WR"],                                           name:"Shropshire & Welsh Borders" },
  { id:"cheshire",         postcodes:["CW","CH","SK","WA"],                                 name:"Cheshire & Peak District" },
  { id:"manchester",       postcodes:["M","BL","OL","WN","L"],                              name:"Greater Manchester & Merseyside" },
  { id:"lancashire",       postcodes:["PR","FY","BB"],                                      name:"Lancashire & Fylde Coast" },
  { id:"cumbria",          postcodes:["CA","LA"],                                           name:"Cumbria & Lake District" },
  { id:"yorkshire",        postcodes:["LS","BD","HX","WF","HG","HD","S","HU"],              name:"Yorkshire (Leeds, York & Dales)" },
  { id:"north_yorkshire",  postcodes:["YO","DL"],                                           name:"North Yorkshire Moors & Coast" },
  { id:"north_east",       postcodes:["NE","DH","SR","TS"],                                 name:"North East England" },
  { id:"north_wales",      postcodes:["LL"],                                                name:"North Wales & Snowdonia" },
  { id:"mid_wales",        postcodes:["LD"],                                                name:"Mid Wales & Ceredigion" },
  { id:"pembrokeshire",    postcodes:["SA"],                                                name:"Pembrokeshire & West Wales" },
  { id:"south_wales",      postcodes:["CF","NP"],                                           name:"South Wales, Cardiff & Newport" },
  { id:"scottish_borders", postcodes:["TD","DG"],                                           name:"Scottish Borders & Dumfries" },
  { id:"edinburgh",        postcodes:["EH","KY"],                                           name:"Edinburgh, Lothians & Fife" },
  { id:"glasgow",          postcodes:["G","ML","KA","FK"],                                  name:"Glasgow, Clyde Valley & Ayrshire" },
  { id:"argyll",           postcodes:["PA"],                                                name:"Argyll, Loch Lomond & Trossachs" },
  { id:"tayside",          postcodes:["DD","PH"],                                           name:"Tayside, Perthshire & Dundee" },
  { id:"aberdeen",         postcodes:["AB"],                                                name:"Aberdeen & Aberdeenshire" },
  { id:"highlands",        postcodes:["IV"],                                                name:"Highlands & Inverness" },
  { id:"far_north",        postcodes:["KW"],                                                name:"Far North Scotland & Caithness" },
  { id:"western_isles",    postcodes:["HS"],                                                name:"Western Isles & Outer Hebrides" },
  { id:"orkney_shetland",  postcodes:["ZE"],                                                name:"Orkney & Shetland" },
  { id:"northern_ireland", postcodes:["BT"],                                                name:"Northern Ireland" },
];

// All known UK postcode area codes
const ALL_AREAS = [
  "AB","AL","B","BA","BB","BD","BH","BL","BN","BR","BS","BT","CA","CB","CF","CH","CM","CO","CR","CT",
  "CV","CW","DA","DD","DE","DG","DH","DL","DN","DT","DY","E","EC","EH","EN","EX","FK","FY","G","GL",
  "GU","HA","HD","HG","HP","HR","HS","HU","HX","IG","IP","IV","KA","KT","KW","KY","L","LA","LD","LE",
  "LL","LN","LS","LU","M","ME","MK","ML","N","NE","NG","NN","NP","NR","NW","OL","OX","PA","PE","PH",
  "PL","PO","PR","RG","RH","RM","S","SA","SE","SG","SK","SL","SM","SN","SO","SP","SR","SS","ST","SW",
  "SY","TA","TD","TF","TN","TQ","TR","TS","TW","UB","W","WA","WC","WD","WF","WN","WR","WS","WV","YO","ZE"
];

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

function getSector(postcode) {
  const id = getSectorId(postcode);
  return id ? SECTORS.find(s => s.id === id) : null;
}

// Generate a random realistic UK postcode from a given area code
function randomPostcodeFromArea(area) {
  const district = Math.floor(Math.random() * 20) + 1;
  const sector   = Math.floor(Math.random() * 9) + 1;
  const letters  = "ABDEFGHJKLMNPQRSTUVWXYZ";
  const unit     = letters[Math.floor(Math.random() * letters.length)] +
                   letters[Math.floor(Math.random() * letters.length)];
  return `${area}${district} ${sector}${unit}`;
}

export default function PostcodePinTester() {
  const [count, setCount]     = useState(50);
  const [results, setResults] = useState([]);
  const [filter, setFilter]   = useState("all"); // all | matched | unmatched

  const run = () => {
    const rows = [];
    for (let i = 0; i < count; i++) {
      const area     = ALL_AREAS[Math.floor(Math.random() * ALL_AREAS.length)];
      const postcode = randomPostcodeFromArea(area);
      const sector   = getSector(postcode);
      rows.push({ postcode, area, sector: sector?.name || null, sectorId: sector?.id || null });
    }
    setResults(rows);
    setFilter("all");
  };

  const runSpecific = (area) => {
    const rows = Array.from({ length: 20 }, () => {
      const postcode = randomPostcodeFromArea(area);
      const sector   = getSector(postcode);
      return { postcode, area, sector: sector?.name || null, sectorId: sector?.id || null };
    });
    setResults(rows);
    setFilter("all");
  };

  const matched   = results.filter(r => r.sector);
  const unmatched = results.filter(r => !r.sector);

  // Coverage stats per sector
  const sectorCounts = matched.reduce((acc, r) => {
    acc[r.sector] = (acc[r.sector] || 0) + 1;
    return acc;
  }, {});

  const displayed = filter === "matched"   ? matched
                  : filter === "unmatched" ? unmatched
                  : results;

  // Find sectors with NO hits in the random sample
  const sectorsInSample = new Set(matched.map(r => r.sectorId));
  const missingSectors  = SECTORS.filter(s => !sectorsInSample.has(s.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Postcode → UK Sector Pin Tester</h2>
        <p className="text-xs text-gray-400">
          Generates random UK postcodes and resolves them to sectors using the same logic as the UK Sectors map.
          Helps verify pin placement and that every postcode area is covered.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Sample size</label>
          <select
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          >
            {[20, 50, 100, 200, ALL_AREAS.length].map(n => (
              <option key={n} value={n}>{n === ALL_AREAS.length ? `All areas (${n})` : n}</option>
            ))}
          </select>
        </div>
        <button
          onClick={run}
          className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a]"
        >
          🎲 Generate Random Sample
        </button>
        <button
          onClick={() => {
            // One postcode per area — exhaustive coverage check
            const rows = ALL_AREAS.map(area => {
              const postcode = randomPostcodeFromArea(area);
              const sector   = getSector(postcode);
              return { postcode, area, sector: sector?.name || null, sectorId: sector?.id || null };
            });
            setResults(rows);
            setFilter("all");
          }}
          className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          🗺️ Full Coverage Check (1 per area)
        </button>
      </div>

      {/* Quick area buttons */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Or test a specific area code:</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_AREAS.map(area => (
            <button
              key={area}
              onClick={() => runSpecific(area)}
              className="px-2 py-1 text-xs border border-gray-200 rounded-md hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors font-mono"
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
              <p className="text-xl font-bold text-gray-900">{results.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total Tested</p>
            </div>
            <div className="bg-green-50 rounded-lg px-4 py-3 text-center">
              <p className="text-xl font-bold text-green-700">{matched.length}</p>
              <p className="text-xs text-green-500 mt-0.5">Matched to Sector ({Math.round(matched.length / results.length * 100)}%)</p>
            </div>
            <div className="bg-red-50 rounded-lg px-4 py-3 text-center">
              <p className="text-xl font-bold text-red-600">{unmatched.length}</p>
              <p className="text-xs text-red-400 mt-0.5">No Sector Match ({Math.round(unmatched.length / results.length * 100)}%)</p>
            </div>
          </div>

          {/* Missing sectors warning */}
          {missingSectors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Sectors not hit in this sample ({missingSectors.length})</p>
              <p className="text-xs text-amber-600">{missingSectors.map(s => s.name).join(" · ")}</p>
            </div>
          )}

          {/* Unmatched areas */}
          {unmatched.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-red-700 mb-1">❌ Unmatched postcode areas (need adding to SECTORS)</p>
              <p className="text-xs text-red-600 font-mono">{[...new Set(unmatched.map(r => r.area))].sort().join(", ")}</p>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2">
            {["all","matched","unmatched"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filter === f ? "bg-[#1E3A5F] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? `All (${results.length})` : f === "matched" ? `Matched (${matched.length})` : `Unmatched (${unmatched.length})`}
              </button>
            ))}
          </div>

          {/* Results table */}
          <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Postcode</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Area Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Resolved Sector</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{r.postcode}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-gray-500">{r.area}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{r.sector || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5">
                      {r.sector
                        ? <span className="text-xs text-green-600 font-medium">✅ Matched</span>
                        : <span className="text-xs text-red-500 font-medium">❌ Unmatched</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sector distribution */}
          {Object.keys(sectorCounts).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sector distribution (matched hits)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).map(([name, cnt]) => (
                  <div key={name} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-600 truncate">{name}</span>
                    <span className="text-xs font-bold text-teal-700 ml-2 flex-shrink-0">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}