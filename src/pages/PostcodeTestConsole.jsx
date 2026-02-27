import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Server, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const RADIUS_CHOICES = [5, 10, 25, 50];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getRandomTestCase() {
  const categories = [
    { name: "England", postcodes: ["SW1A 1AA", "M1 1AE", "YO1 7HP", "BR1 1LU", "GL50 1UL"] },
    { name: "Wales", postcodes: ["CF10 1AA", "SA1 3SN", "LL30 1AB", "NP20 1DD"] },
    { name: "Scotland", postcodes: ["EH1 1AA", "G1 1XQ", "IV1 1SY", "AB10 1AB"] },
    { name: "Northern Ireland", postcodes: ["BT1 1AA", "BT7 1NN", "BT48 6DQ"] },
    { name: "Rural", postcodes: ["TR21 0LL", "IV54 8XB", "LL45 2LT", "KW1 4YT"] }
  ];
  const category = randomFrom(categories);
  return { category: category.name, postcode: randomFrom(category.postcodes), radiusMiles: randomFrom(RADIUS_CHOICES) };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function runLocalSuite() {
  const logs = [], summary = [], batches = [];
  const log = (m) => logs.push(`${new Date().toISOString()} ${m}`);
  const pass = (section, extra = {}) => summary.push({ section, status: "PASS", ...extra });
  const warn = (section, extra = {}) => summary.push({ section, status: "WARN", ...extra });
  const fail = (section, error, extra = {}) => summary.push({ section, status: "FAIL", error: String(error), ...extra });

  for (let i = 0; i < 3; i++) {
    const pick = getRandomTestCase();
    const outward = pick.postcode.slice(0, 3);
    const batch = { index: i + 1, region: pick.category, postcode: pick.postcode, outward, radiusMiles: pick.radiusMiles, steps: [], ok: true };

    try {
      log(`🎯 [Batch ${batch.index}] ${batch.region} / ${batch.postcode} / ${batch.radiusMiles}mi`);

      const clean = pick.postcode.replace(/\s+/g, '').toUpperCase();
      
      // Try active postcode
      let lookup = await fetch(`https://api.postcodes.io/postcodes/${clean}`).then(r => r.json());
      
      // Try terminated if not found
      if (lookup?.status !== 200) {
        lookup = await fetch(`https://api.postcodes.io/terminated_postcodes/${clean}`).then(r => r.json());
      }
      
      batch.steps.push({ name: "Full Lookup", status: lookup?.status });
      if (lookup?.status !== 200) throw new Error(`Lookup failed: ${pick.postcode}`);
      const { latitude, longitude } = lookup.result || {};
      if (typeof latitude !== "number") throw new Error("Missing coordinates");
      pass("Full Lookup", { batch: batch.index, postcode: pick.postcode });

      const search = await fetch(`https://api.postcodes.io/postcodes?q=${outward}`).then(r => r.json());
      batch.steps.push({ name: "Partial Search", count: search?.result?.length || 0 });
      if (!search?.result?.length) throw new Error(`Partial search empty for ${outward}`);
      pass("Partial Search", { batch: batch.index, outward });

      const places = ["London", "Edinburgh", "Cardiff", "Belfast", "Polperro", "Looe"];
      const placeName = randomFrom(places);
      const place = await fetch(`https://api.postcodes.io/places/${encodeURIComponent(placeName)}`).then(r => r.json());
      batch.steps.push({ name: "Place Lookup", place: placeName, status: place?.status });
      if (place?.status === 200) pass("Place Lookup", { batch: batch.index, place: placeName });
      else warn("Place Lookup", { batch: batch.index, place: placeName });

      const props = [{ id: 1, lat: latitude + 0.02, lng: longitude + 0.02 }, { id: 2, lat: latitude + 1.0, lng: longitude + 1.0 }];
      const inside = props.filter(p => haversineMiles(latitude, longitude, p.lat, p.lng) <= batch.radiusMiles);
      batch.steps.push({ name: "Radius", insideIds: inside.map(p => p.id) });
      if (!inside.some(p => p.id === 1) || inside.some(p => p.id === 2)) throw new Error(`Radius failed @ ${batch.radiusMiles}mi`);
      pass("Radius Math", { batch: batch.index, radiusMiles: batch.radiusMiles });

    } catch (e) {
      batch.ok = false;
      fail("Batch", e, { batch: batch.index });
    }
    batches.push(batch);
  }

  const ok = summary.every(s => s.status !== "FAIL");
  return { ok, batches, summary, logs };
}

function StatusIcon({ status }) {
  if (status === "PASS") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "WARN") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function BatchCard({ batch }) {
  return (
    <div className={`border rounded-lg p-4 ${batch.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800">Batch #{batch.index}</span>
        <Badge className={batch.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
          {batch.ok ? "PASS" : "FAIL"}
        </Badge>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <div><span className="font-medium">Region:</span> {batch.region}</div>
        <div><span className="font-medium">Postcode:</span> {batch.postcode}</div>
        <div><span className="font-medium">Radius:</span> {batch.radiusMiles} miles</div>
        <div className="flex flex-wrap gap-1 mt-2">
          {batch.steps.map((s, i) => (
            <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{s.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PostcodeTestConsole() {
  const [runningLocal, setRunningLocal] = useState(false);
  const [runningServer, setRunningServer] = useState(false);
  const [localResult, setLocalResult] = useState(null);
  const [serverResult, setServerResult] = useState(null);
  const [rawLog, setRawLog] = useState("");

  async function runLocal() {
    setRunningLocal(true);
    setLocalResult(null);
    setRawLog("⏳ Running locally...");
    try {
      const result = await runLocalSuite();
      setLocalResult(result);
      setRawLog(result.logs.join("\n"));
    } catch (e) {
      setRawLog(`❌ Error: ${e.message}`);
    } finally {
      setRunningLocal(false);
    }
  }

  async function runServer() {
    setRunningServer(true);
    setServerResult(null);
    try {
      const res = await base44.functions.invoke('runPostcodeTests', {});
      setServerResult(res.data);
    } catch (e) {
      setServerResult({ ok: false, error: e.message });
    } finally {
      setRunningServer(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">🧪 UK Postcode Test Console</h1>
          <p className="text-gray-500 text-sm">
            Each run picks a <strong>random region</strong> (England / Wales / Scotland / NI / Rural) and a <strong>random radius</strong> (5/10/25/50 mi).
            The server run emails results to <strong>Admin@hostkeepdigital.co.uk</strong> every time.
          </p>
        </div>

        <div className="flex gap-3 mb-8">
          <Button onClick={runLocal} disabled={runningLocal} variant="outline" className="gap-2">
            {runningLocal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {runningLocal ? "Running…" : "Run Locally (no email)"}
          </Button>
          <Button onClick={runServer} disabled={runningServer} className="gap-2 bg-teal-600 hover:bg-teal-700">
            {runningServer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
            {runningServer ? "Running on Server…" : "Run on Server (emails results)"}
          </Button>
        </div>

        {/* Local Results */}
        {localResult && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Local Results</h2>
              <Badge className={localResult.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {localResult.ok ? "✅ PASS" : "❌ FAIL"}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {localResult.batches.map(b => <BatchCard key={b.index} batch={b} />)}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-3 py-2 text-xs text-gray-400 font-mono">Summary</div>
              <div className="bg-gray-900 p-3 space-y-1">
                {localResult.summary.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <StatusIcon status={s.status} />
                    <span className="text-gray-300">[{s.status}] {s.section}</span>
                    {s.postcode && <span className="text-gray-500">pc={s.postcode}</span>}
                    {s.outward && <span className="text-gray-500">out={s.outward}</span>}
                    {s.radiusMiles && <span className="text-gray-500">r={s.radiusMiles}mi</span>}
                    {s.error && <span className="text-red-400">{s.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Raw Log */}
        {rawLog && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Raw Log</h2>
            <pre className="bg-gray-900 text-green-400 text-xs font-mono p-4 rounded-lg max-h-48 overflow-auto whitespace-pre-wrap">
              {rawLog}
            </pre>
          </div>
        )}

        {/* Server Results */}
        {serverResult && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Server Response</h2>
              <Badge className={serverResult.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {serverResult.ok ? "✅ PASS" : "❌ FAIL"}
              </Badge>
              {serverResult.ok !== undefined && (
                <span className="text-xs text-gray-500">📧 Email sent to Admin@hostkeepdigital.co.uk</span>
              )}
            </div>
            {serverResult.batches && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {serverResult.batches.map(b => <BatchCard key={b.index} batch={b} />)}
              </div>
            )}
            <pre className="bg-gray-900 text-green-400 text-xs font-mono p-4 rounded-lg max-h-64 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(serverResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}