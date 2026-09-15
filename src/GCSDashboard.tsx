import { useState, useEffect, useRef } from "react";

interface Telemetry {
  rpm: number; map: number; fuelFlow: number; oilPressure: number; oilTemp: number;
  cht: number[]; egt: number[]; vibration: number; altitude: number; throttle: number; missionTime: number;
}
interface PhysicsBaseline { expectedCHT: number[]; expectedEGT: number[]; expectedOilTemp: number; expectedFuelFlow: number; }
interface Residuals { cht: number[]; egt: number[]; oilTemp: number; fuelFlow: number; }
interface Fault { id: string; severity: "CRITICAL" | "CAUTION" | "ADVISORY"; code: string; description: string; cylinder?: number; timestamp: string; }
interface HealthIndex { overall: number; cylinder: number[]; lubrication: number; combustion: number; thermal: number; rulHours: number; }

function computePhysicsBaseline(t: Telemetry): PhysicsBaseline {
  const rpmF = t.rpm / 2700, mapF = t.map / 101.3;
  const bCHT = 135 + rpmF * 80 + mapF * 30, bEGT = 650 + rpmF * 150 + mapF * 60;
  return {
    expectedCHT: [bCHT, bCHT + 2, bCHT - 1, bCHT + 3],
    expectedEGT: [bEGT, bEGT - 5, bEGT + 8, bEGT - 3],
    expectedOilTemp: 85 + rpmF * 25,
    expectedFuelFlow: 8.2 + rpmF * 6.4 * mapF,
  };
}
function computeResiduals(t: Telemetry, b: PhysicsBaseline): Residuals {
  return { cht: t.cht.map((v, i) => v - b.expectedCHT[i]), egt: t.egt.map((v, i) => v - b.expectedEGT[i]), oilTemp: t.oilTemp - b.expectedOilTemp, fuelFlow: t.fuelFlow - b.expectedFuelFlow };
}

const deg = { cyl2: 0, cyl4: 0, oil: 0 };

function generateTelemetry(tick: number, seed: number): Telemetry {
  const t = tick * 0.5;
  const rpm = 2400 + Math.sin(t * 0.03) * 80 + (Math.random() - 0.5) * 20;
  const mapPa = 95 + Math.sin(t * 0.02) * 8;
  deg.cyl2 = Math.min(1, tick * 0.0004 + (seed > 0.5 ? tick * 0.0008 : 0));
  deg.cyl4 = Math.min(1, tick * 0.0003);
  deg.oil   = Math.min(1, tick * 0.00025 + (seed > 0.7 ? tick * 0.0006 : 0));
  const bRPM = rpm / 2700, bCHT = 138 + bRPM * 78, bEGT = 658 + bRPM * 145;
  return {
    rpm: Math.round(rpm), map: mapPa,
    fuelFlow: 11.4 + bRPM * 5.8 + deg.cyl4 * 1.8 + (Math.random() - 0.5) * 0.3,
    oilPressure: Math.max(180, 340 - deg.oil * 120 + (Math.random() - 0.5) * 8),
    oilTemp: 88 + bRPM * 22 + deg.oil * 18 + (Math.random() - 0.5) * 1.5,
    cht: [bCHT + (Math.random() - 0.5) * 3, bCHT + deg.cyl2 * 55 + (Math.random() - 0.5) * 4, bCHT - 2 + (Math.random() - 0.5) * 3, bCHT + deg.cyl4 * 20 + (Math.random() - 0.5) * 4],
    egt: [bEGT + (Math.random() - 0.5) * 8, bEGT + deg.cyl2 * 42 + (Math.random() - 0.5) * 10, bEGT - 6 + (Math.random() - 0.5) * 8, bEGT - deg.cyl4 * 28 + (Math.random() - 0.5) * 10],
    vibration: 0.08 + deg.cyl2 * 0.18 + deg.cyl4 * 0.12 + (Math.random() - 0.5) * 0.02,
    altitude: 3200 + Math.sin(t * 0.008) * 400,
    throttle: 72 + Math.sin(t * 0.015) * 12,
    missionTime: tick * 0.5,
  };
}

function detectFaults(t: Telemetry, r: Residuals): Fault[] {
  const faults: Fault[] = [];
  const ts = new Date().toISOString().substr(11, 8);
  if (r.cht[1] > 28) faults.push({ id: "F001", severity: r.cht[1] > 45 ? "CRITICAL" : "CAUTION", code: "CHT-C2-HIGH", description: "Cylinder 2 thermal anomaly — cooling duct restriction suspected", cylinder: 2, timestamp: ts });
  if (deg.oil > 0.35) faults.push({ id: "F002", severity: deg.oil > 0.6 ? "CRITICAL" : "CAUTION", code: "OIL-PRES-DROP", description: "Lubrication pressure trending below nominal — seal wear progressing", timestamp: ts });
  if (r.egt[3] < -20) faults.push({ id: "F003", severity: "ADVISORY", code: "EGT-C4-LOW", description: "Cylinder 4 EGT deficit — injector partial clog detected", cylinder: 4, timestamp: ts });
  if (t.vibration > 0.22) faults.push({ id: "F004", severity: t.vibration > 0.3 ? "CRITICAL" : "ADVISORY", code: "VIB-EXCEED", description: "Broadband vibration above baseline — structural resonance", timestamp: ts });
  return faults;
}

function computeHI(t: Telemetry, r: Residuals, f: Fault[], tick: number): HealthIndex {
  const cylH = [100 - Math.max(0, r.cht[0]) * 0.3, 100 - deg.cyl2 * 55, 100 - Math.max(0, r.cht[2]) * 0.2, 100 - deg.cyl4 * 35].map(v => Math.max(0, Math.min(100, v)));
  const lub = Math.max(0, 100 - deg.oil * 85), comb = Math.max(0, 100 - deg.cyl4 * 40), therm = Math.max(0, 100 - deg.cyl2 * 45 - (t.vibration - 0.08) * 100);
  const overall = cylH.reduce((a, b) => a + b) / 4 * 0.35 + lub * 0.25 + comb * 0.2 + therm * 0.2;
  return { overall: Math.round(Math.min(100, Math.max(0, overall))), cylinder: cylH.map(Math.round), lubrication: Math.round(lub), combustion: Math.round(comb), thermal: Math.round(therm), rulHours: Math.max(0, Math.round(overall / 100 * 280 - tick * 0.002)) };
}

function TelCell({ label, value, unit, warn, crit, precision = 0, sub }: { label: string; value: number; unit: string; warn: number; crit: number; precision?: number; sub?: string }) {
  const s = value >= crit ? "critical" : value >= warn ? "warn" : "ok";
  const c = s === "critical" ? "#ef4444" : s === "warn" ? "#f59e0b" : "#22c55e";
  return (
    <div className="p-3 border flex flex-col gap-1 relative" style={{ background: s === "critical" ? "rgba(239,68,68,0.05)" : s === "warn" ? "rgba(245,158,11,0.04)" : "#0d1318", borderColor: c + "40", transition: "border-color 0.3s" }}>
      <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.15em", color: "#556678", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 600, color: s === "ok" ? "white" : c, transition: "color 0.3s" }}>
        {value.toFixed(precision)}<span style={{ fontSize: 10, fontWeight: 400, color: "#556678", marginLeft: 4 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678" }}>{sub}</div>}
      {s === "critical" && <div style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse-amber 2s ease-in-out infinite" }} />}
    </div>
  );
}

function MiniChart({ data, color, h = 40 }: { data: number[]; color: string; h?: number }) {
  if (data.length < 2) return <div style={{ height: h }} />;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const W = 200;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${h - ((v - mn) / rng) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 3px ${color}60)` }} />
      <polyline points={`0,${h} ${pts} ${W},${h}`} fill={`${color}10`} stroke="none" />
    </svg>
  );
}

export default function GCSDashboard() {
  const seed = useRef(Math.random());
  const [tick, setTick] = useState(0);
  const [tel, setTel] = useState<Telemetry>(() => generateTelemetry(0, seed.current));
  const [base, setBase] = useState<PhysicsBaseline>(() => computePhysicsBaseline(generateTelemetry(0, seed.current)));
  const [res, setRes] = useState<Residuals>({ cht: [0,0,0,0], egt: [0,0,0,0], oilTemp: 0, fuelFlow: 0 });
  const [faults, setFaults] = useState<Fault[]>([]);
  const [hi, setHI] = useState<HealthIndex>({ overall: 100, cylinder: [100,100,100,100], lubrication: 100, combustion: 100, thermal: 100, rulHours: 280 });
  const [rpmH, setRpmH] = useState<number[]>([]);
  const [hiH, setHiH] = useState<number[]>([]);
  const [tab, setTab] = useState<"live"|"residuals"|"prognosis">("live");

  useEffect(() => {
    const iv = setInterval(() => {
      setTick(prev => {
        const n = prev + 1;
        const t = generateTelemetry(n, seed.current);
        const b = computePhysicsBaseline(t);
        const r = computeResiduals(t, b);
        const f = detectFaults(t, r);
        const h = computeHI(t, r, f, n);
        setTel(t); setBase(b); setRes(r); setFaults(f); setHI(h);
        setRpmH(p => [...p.slice(-60), t.rpm]);
        setHiH(p => [...p.slice(-60), h.overall]);
        return n;
      });
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const critFault = faults.find(f => f.severity === "CRITICAL");
  const hiColor = hi.overall > 75 ? "#22c55e" : hi.overall > 50 ? "#f59e0b" : "#ef4444";
  const mins = Math.floor(tel.missionTime / 60), secs = Math.floor(tel.missionTime % 60);

  const cylColors = hi.cylinder.map(h => h < 40 ? "#ef4444" : h < 65 ? "#f59e0b" : "#22c55e");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#080c10", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 44, borderBottom: "1px solid #1e2d3d", background: "#080c10", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 15, letterSpacing: "0.15em", color: "#f59e0b" }}>AeroDTwin</span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678", letterSpacing: "0.15em" }}>GCS ENGINE DIGITAL TWIN · MQ-ALPHA-07</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#8fa0b0" }}>ALT <b style={{ color: "#fff" }}>{Math.round(tel.altitude).toLocaleString()}</b>m</span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#8fa0b0" }}>MET <b style={{ color: "#fff" }}>{String(mins).padStart(3,"0")}:{String(secs).padStart(2,"0")}</b></span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: hiColor, fontWeight: 700 }}>HI {hi.overall}%</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#22c55e", letterSpacing: "0.15em" }}>LIVE</span>
        </div>
      </div>

      {/* Advisory */}
      {critFault && (
        <div style={{ padding: "6px 20px", background: "rgba(239,68,68,0.1)", borderBottom: "1px solid rgba(239,68,68,0.3)", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#ef4444", fontWeight: 700, letterSpacing: "0.2em" }}>▲ ADVISORY</span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#fca5a5" }}>{critFault.code} — {critFault.description}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderBottom: "1px solid #1e2d3d", background: "#080c10", gap: 0, flexShrink: 0 }}>
        {(["live","residuals","prognosis"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ fontFamily: "Rajdhani", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", padding: "10px 16px", background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "#f59e0b" : "transparent"}`, color: tab === t ? "#f59e0b" : "#556678", cursor: "pointer", transition: "all 0.2s" }}>
            {t === "live" ? "Live Telemetry" : t === "residuals" ? "State Residuals" : "Prognostics"}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontFamily: "JetBrains Mono", fontSize: 10, color: "#556678" }}>
          THR <span style={{ color: "#f59e0b" }}>{Math.round(tel.throttle)}%</span> · MAP <span style={{ color: "#fff" }}>{tel.map.toFixed(1)} kPa</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tab === "live" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 12 }}>
            {/* Primary readouts */}
            <div style={{ gridColumn: "span 8", background: "#0d1318", border: "1px solid #1e2d3d", padding: 16 }}>
              <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#556678", textTransform: "uppercase", marginBottom: 12 }}>Primary Parameters</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                <TelCell label="RPM" value={tel.rpm} unit="rpm" warn={2500} crit={2650} />
                <TelCell label="Oil Pressure" value={tel.oilPressure} unit="kPa" warn={270} crit={220} />
                <TelCell label="Oil Temp" value={tel.oilTemp} unit="°C" warn={110} crit={125} />
                <TelCell label="Fuel Flow" value={tel.fuelFlow} unit="L/h" warn={18} crit={20} precision={1} />
              </div>
            </div>

            {/* HI panel */}
            <div style={{ gridColumn: "span 4", background: "#0d1318", border: "1px solid #1e2d3d", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#556678", textTransform: "uppercase" }}>Engine Health</div>
              <div style={{ fontFamily: "Rajdhani", fontSize: 48, fontWeight: 700, color: hiColor, lineHeight: 1, textShadow: `0 0 20px ${hiColor}60` }}>{hi.overall}<span style={{ fontSize: 20, color: "#556678" }}>/100</span></div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678", letterSpacing: "0.1em" }}>RUL ESTIMATE</div>
              <div style={{ fontFamily: "Rajdhani", fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{hi.rulHours}<span style={{ fontSize: 13, color: "#556678", marginLeft: 4 }}>hrs</span></div>
              <div style={{ height: 4, background: "#0d1318", border: "1px solid #1e2d3d" }}>
                <div style={{ height: "100%", width: `${(hi.rulHours / 280) * 100}%`, background: "#f59e0b", transition: "width 0.5s" }} />
              </div>
            </div>

            {/* CHT / EGT cells */}
            <div style={{ gridColumn: "span 12", display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 8 }}>
              {tel.cht.map((v, i) => (
                <TelCell key={`cht${i}`} label={`CHT CYL ${i+1}`} value={v} unit="°C" warn={185} crit={220} sub={`Δ${res.cht[i]>=0?"+":""}${res.cht[i].toFixed(1)}°`} />
              ))}
              {tel.egt.map((v, i) => (
                <TelCell key={`egt${i}`} label={`EGT CYL ${i+1}`} value={v} unit="°C" warn={820} crit={900} sub={`Δ${res.egt[i]>=0?"+":""}${res.egt[i].toFixed(1)}°`} />
              ))}
            </div>

            {/* Cylinder 3D schematic */}
            <div style={{ gridColumn: "span 8", background: "#0d1318", border: "1px solid #1e2d3d", padding: 16 }}>
              <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#8fa0b0", textTransform: "uppercase", marginBottom: 8 }}>Cylinder Bank — Thermal Status</div>
              <svg viewBox="0 0 480 180" style={{ width: "100%", maxHeight: 160 }}>
                <rect x="20" y="110" width="440" height="45" fill="#111820" stroke="#1e2d3d" strokeWidth="1" />
                {[60,155,250,345].map((x,i) => {
                  const intensity = Math.min(1, Math.max(0, (tel.cht[i] - 120) / 120));
                  const col = cylColors[i];
                  const rgb = col === "#ef4444" ? "239,68,68" : col === "#f59e0b" ? "245,158,11" : "34,197,94";
                  return (
                    <g key={i}>
                      <rect x={x} y="45" width="75" height="68" rx="1"
                        fill={`rgba(${rgb},${intensity*0.15+0.04})`} stroke={col} strokeWidth="1"
                        style={{ filter: `drop-shadow(0 0 6px rgba(${rgb},0.4))`, transition: "all 0.5s" }} />
                      <polygon points={`${x+75},45 ${x+86},34 ${x+86},103 ${x+75},113`} fill={`rgba(${rgb},${intensity*0.07+0.02})`} stroke={col} strokeWidth="0.5" opacity="0.5" />
                      <polygon points={`${x},45 ${x+11},34 ${x+86},34 ${x+75},45`} fill={`rgba(${rgb},${intensity*0.1+0.05})`} stroke={col} strokeWidth="0.5" opacity="0.6" />
                      {[8,18,28,38,48].map((dy,j) => <line key={j} x1={x+4} y1={45+dy} x2={x+71} y2={45+dy} stroke={col} strokeWidth="0.3" opacity="0.15" />)}
                      <circle cx={x+37} cy="28" r="4" fill="#0d1318" stroke={col} strokeWidth="1" />
                      <line x1={x+37} y1="32" x2={x+37} y2="45" stroke={col} strokeWidth="0.8" opacity="0.5" />
                      <text x={x+37} y="91" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="11" fill={col} fontWeight="600">CYL {i+1}</text>
                      <text x={x+37} y="103" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={col} opacity="0.8">{Math.round(tel.cht[i])}°C</text>
                      <rect x={x+20} y="52" width="35" height="14" rx="1" fill="rgba(8,12,16,0.8)" stroke={col} strokeWidth="0.5" />
                      <text x={x+37} y="62" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill={col} fontWeight="700">{hi.cylinder[i]}%</text>
                    </g>
                  );
                })}
                <text x="240" y="168" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#556678">FLAT-4 OPPOSED BOXER</text>
              </svg>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 8 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ background: "#080c10", border: `1px solid ${cylColors[i]}40`, padding: "8px 10px" }}>
                    <div style={{ fontFamily: "Rajdhani", fontSize: 9, color: "#556678", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>CYL {i+1}</div>
                    {[["CHT",`${Math.round(tel.cht[i])}°C`],["EGT",`${Math.round(tel.egt[i])}°C`],["HI",`${hi.cylinder[i]}%`]].map(([k,v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678" }}>{k}</span>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, fontWeight: 600, color: cylColors[i] }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Faults */}
            <div style={{ gridColumn: "span 4", background: "#0d1318", border: "1px solid #1e2d3d", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#8fa0b0", textTransform: "uppercase" }}>Fault Register</span>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: faults.length > 0 ? "#ef4444" : "#22c55e" }}>{faults.length > 0 ? `${faults.length} ACTIVE` : "CLEAR"}</span>
              </div>
              {faults.length === 0 ? (
                <div style={{ flex: 1, border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.05)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                  <div style={{ textAlign: "center", fontFamily: "JetBrains Mono", fontSize: 10, color: "#22c55e" }}>■ ALL SYSTEMS NOMINAL</div>
                </div>
              ) : faults.map(f => {
                const fc = f.severity === "CRITICAL" ? "#ef4444" : f.severity === "CAUTION" ? "#f59e0b" : "#60a5fa";
                return (
                  <div key={f.id} style={{ border: `1px solid ${fc}40`, background: `${fc}08`, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: fc, fontWeight: 700, letterSpacing: "0.15em" }}>{f.severity}</span>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#fff", fontWeight: 600 }}>{f.code}</span>
                      </div>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678" }}>{f.timestamp}Z</span>
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#8fa0b0", lineHeight: 1.5 }}>{f.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "residuals" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 12 }}>
            <div style={{ gridColumn: "span 8", background: "#0d1318", border: "1px solid #1e2d3d", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#8fa0b0", textTransform: "uppercase" }}>State Residual Tracker — Δ = Actual − Expected</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[{ title: "CHT Residuals (°C)", vals: res.cht, range: 60, unit: "°C" }, { title: "EGT Residuals (°C)", vals: res.egt, range: 80, unit: "°C" }].map(({ title, vals, range, unit }) => (
                  <div key={title}>
                    <div style={{ fontFamily: "Rajdhani", fontSize: 11, color: "#f59e0b", letterSpacing: "0.15em", textTransform: "uppercase", borderBottom: "1px solid #1e2d3d", paddingBottom: 6, marginBottom: 12 }}>{title}</div>
                    {vals.map((v, i) => {
                      const pct = Math.max(-1, Math.min(1, v / range));
                      const c = Math.abs(pct) > 0.6 ? "#ef4444" : Math.abs(pct) > 0.3 ? "#f59e0b" : "#22c55e";
                      const bw = Math.abs(pct) * 50;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678", width: 40, textAlign: "right" }}>CYL {i+1}</span>
                          <div style={{ flex: 1, height: 14, background: "#080c10", border: "1px solid #1e2d3d", position: "relative", display: "flex", alignItems: "center" }}>
                            <div style={{ position: "absolute", left: "50%", width: 1, height: "100%", background: "#1e2d3d" }} />
                            <div style={{ position: "absolute", height: 8, width: `${bw}%`, left: pct >= 0 ? "50%" : `${50 - bw}%`, background: c, opacity: 0.8, transition: "all 0.4s ease" }} />
                          </div>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: c, width: 52 }}>{v >= 0 ? "+" : ""}{v.toFixed(1)}{unit}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid #1e2d3d", paddingTop: 12 }}>
                {[{ l: "Oil Temp", v: res.oilTemp, r: 30, u: "°C" }, { l: "Fuel Flow", v: res.fuelFlow, r: 3, u: " L/h" }].map(({ l, v, r, u }) => {
                  const pct = Math.max(-1, Math.min(1, v / r)), c = Math.abs(pct) > 0.6 ? "#ef4444" : Math.abs(pct) > 0.3 ? "#f59e0b" : "#22c55e", bw = Math.abs(pct) * 50;
                  return (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678", width: 56, textAlign: "right" }}>{l}</span>
                      <div style={{ flex: 1, height: 14, background: "#080c10", border: "1px solid #1e2d3d", position: "relative", display: "flex", alignItems: "center" }}>
                        <div style={{ position: "absolute", left: "50%", width: 1, height: "100%", background: "#1e2d3d" }} />
                        <div style={{ position: "absolute", height: 8, width: `${bw}%`, left: pct >= 0 ? "50%" : `${50 - bw}%`, background: c, opacity: 0.8, transition: "all 0.4s" }} />
                      </div>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: c, width: 52 }}>{v >= 0 ? "+" : ""}{v.toFixed(2)}{u}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#0d1318", border: "1px solid #1e2d3d", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#8fa0b0", textTransform: "uppercase" }}>Anomaly Confidence</div>
                {[
                  { n: "Injector Clog C4", s: Math.round(deg.cyl4 * 100) },
                  { n: "Cooling Restrict C2", s: Math.round(deg.cyl2 * 100) },
                  { n: "Oil Seal Wear", s: Math.round(deg.oil * 100) },
                  { n: "Vibration Drift", s: Math.round(Math.max(0,(tel.vibration-0.08)/0.22)*100) },
                ].map(a => (
                  <div key={a.n} style={{ border: `1px solid ${a.s > 30 ? "#f59e0b40" : "#1e2d3d"}`, background: a.s > 30 ? "rgba(245,158,11,0.04)" : "transparent", padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#8fa0b0" }}>{a.n}</span>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, fontWeight: 700, color: a.s > 60 ? "#ef4444" : a.s > 30 ? "#f59e0b" : "#22c55e" }}>{a.s}%</span>
                    </div>
                    <div style={{ height: 3, background: "#080c10" }}>
                      <div style={{ height: "100%", width: `${a.s}%`, background: a.s > 60 ? "#ef4444" : a.s > 30 ? "#f59e0b" : "#22c55e", transition: "width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#0d1318", border: "1px solid #1e2d3d", padding: 16, flex: 1 }}>
                <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#8fa0b0", textTransform: "uppercase", marginBottom: 10 }}>ML Models</div>
                {[["Autoencoder","12ms"],["Isolation Forest","8ms"],["LSTM-RUL","34ms"],["Physics Engine","2ms"]].map(([n,l]) => (
                  <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#8fa0b0" }}>{n}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678" }}>{l}</span>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#22c55e" }}>ACTIVE</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "prognosis" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 12 }}>
            <div style={{ gridColumn: "span 5", background: "#0d1318", border: "1px solid #1e2d3d", padding: 20 }}>
              <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#8fa0b0", textTransform: "uppercase", marginBottom: 14 }}>Health Index Breakdown</div>
              {[
                { label: "Overall Engine HI", val: hi.overall },
                { label: "Cylinder 1", val: hi.cylinder[0] },
                { label: "Cylinder 2", val: hi.cylinder[1] },
                { label: "Cylinder 3", val: hi.cylinder[2] },
                { label: "Cylinder 4", val: hi.cylinder[3] },
                { label: "Lubrication", val: hi.lubrication },
                { label: "Combustion", val: hi.combustion },
                { label: "Thermal Mgmt", val: hi.thermal },
              ].map(({ label, val }) => {
                const c = val > 75 ? "#22c55e" : val > 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: "Rajdhani", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8fa0b0" }}>{label}</span>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, fontWeight: 700, color: c }}>{val}%</span>
                    </div>
                    <div style={{ height: 4, background: "#0d1318", border: "1px solid #1e2d3d" }}>
                      <div style={{ height: "100%", width: `${val}%`, background: c, boxShadow: `0 0 6px ${c}50`, transition: "width 0.5s, background 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#0d1318", border: "1px solid #1e2d3d", padding: 20 }}>
                <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#8fa0b0", textTransform: "uppercase", marginBottom: 12 }}>Remaining Useful Life Projection</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "RUL Estimate", val: `${hi.rulHours}`, unit: "flight hours", c: "#f59e0b" },
                    { label: "Confidence", val: "87.4%", unit: "LSTM survival", c: "#fff" },
                    { label: "CBM Action", val: hi.rulHours < 60 ? "IMMEDIATE" : hi.rulHours < 120 ? "SCHEDULE" : "ROUTINE", unit: "maintenance trigger", c: hi.rulHours < 60 ? "#ef4444" : hi.rulHours < 120 ? "#f59e0b" : "#22c55e" },
                  ].map(({ label, val, unit, c }) => (
                    <div key={label}>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: "Rajdhani", fontSize: 28, fontWeight: 700, color: c, textShadow: `0 0 16px ${c}40`, lineHeight: 1 }}>{val}</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678", marginTop: 2 }}>{unit}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 20, background: "#080c10", border: "1px solid #1e2d3d", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                    <div style={{ width: "21.4%", background: "rgba(239,68,68,0.2)" }} />
                    <div style={{ width: "21.4%", background: "rgba(245,158,11,0.2)" }} />
                    <div style={{ flex: 1, background: "rgba(34,197,94,0.08)" }} />
                  </div>
                  <div style={{ position: "absolute", inset: 0, left: 0, width: `${(hi.rulHours / 280) * 100}%`, borderRight: "2px solid #f59e0b", transition: "width 0.5s" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 8px" }}>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: "#556678" }}>0 hr — CBM — WARN — CURRENT {hi.rulHours}h — 280h TBO</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[{ label: "RPM Trend", val: tel.rpm, unit: "rpm", data: rpmH, color: "#f59e0b" }, { label: "Health Index", val: `${hi.overall}%`, unit: "", data: hiH, color: "#22c55e" }].map(({ label, val, unit, data, color }) => (
                  <div key={label} style={{ background: "#0d1318", border: "1px solid #1e2d3d", padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8fa0b0" }}>{label}</span>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, fontWeight: 600, color }}>{val} {unit}</span>
                    </div>
                    <div style={{ borderBottom: "1px solid #1e2d3d" }}>
                      <MiniChart data={data} color={color} h={40} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#0d1318", border: "1px solid #1e2d3d", padding: 14 }}>
                <div style={{ fontFamily: "Rajdhani", fontSize: 10, letterSpacing: "0.2em", color: "#8fa0b0", textTransform: "uppercase", marginBottom: 10 }}>CBM Maintenance Schedule</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", border: "1px solid #1e2d3d" }}>
                  {["Component","Status","RUL","Action"].map(h => (
                    <div key={h} style={{ fontFamily: "Rajdhani", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#556678", padding: "6px 8px", background: "#080c10", borderBottom: "1px solid #1e2d3d" }}>{h}</div>
                  ))}
                  {[
                    ["CYL 2 Cooling Duct", deg.cyl2 > 0.5 ? "DEGRADED" : "WATCH", `${Math.round((1-deg.cyl2)*120)} hr`, deg.cyl2 > 0.5 ? "INSPECT" : "MONITOR"],
                    ["Oil System Seals", deg.oil > 0.4 ? "CAUTION" : "NOMINAL", `${Math.round((1-deg.oil)*180)} hr`, deg.oil > 0.4 ? "SCHEDULE" : "ROUTINE"],
                    ["CYL 4 Injector", deg.cyl4 > 0.3 ? "WATCH" : "NOMINAL", `${Math.round((1-deg.cyl4)*200)} hr`, "MONITOR"],
                    ["Spark Plugs (all)", "NOMINAL", "240 hr", "ROUTINE"],
                  ].map(([comp,stat,rul,action], i) => {
                    const c = stat === "DEGRADED" ? "#ef4444" : stat === "CAUTION" || stat === "WATCH" ? "#f59e0b" : "#22c55e";
                    return [comp,stat,rul,action].map((cell,j) => (
                      <div key={`${i}-${j}`} style={{ fontFamily: "JetBrains Mono", fontSize: 9, padding: "6px 8px", borderBottom: "1px solid #1e2d3d", color: j===1 ? c : "#8fa0b0" }}>{cell}</div>
                    ));
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 20px", borderTop: "1px solid #1e2d3d", background: "#080c10", flexShrink: 0 }}>
        <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678" }}>CAN 2.0B · J1939 · FADEC · SocketCAN · STANAG-4586</span>
        <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678" }}>EDGE: JETSON-NX · 12ms · STREAM OK</span>
        <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#556678" }}>AeroDTwin GCS v2.4.1 © 2026 · UNCLASSIFIED // FOUO</span>
      </div>
    </div>
  );
}
