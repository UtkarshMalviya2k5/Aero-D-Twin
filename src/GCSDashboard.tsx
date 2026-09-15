import { useState, useEffect } from "react";

interface Telemetry {
  rpm: number;
  map: number;
  fuelFlow: number;
  oilPressure: number;
  oilTemp: number;
  cht: number[];
  egt: number[];
  vibration: number;
  altitude: number;
  throttle: number;
  missionTime: number;
  injectionTiming: number;
  ambientTemp: number;
}

interface PhysicsBaseline {
  expectedCHT: number[];
  expectedEGT: number[];
  expectedOilTemp: number;
  expectedOilPress: number;
  expectedFuelFlow: number;
  expectedCombustionEff: number;
  observedCombustionEff: number;
  efficiencyResidual: number;
}

interface ResidualItem {
  param: string;
  unit: string;
  actual: number;
  expected: number;
  residual: number;
  tolerance: number;
  isInconsistent: boolean;
}

interface ModelDiagnostic {
  name: string;
  domain: string;
  parameters: string;
  prediction: string;
  confidence: number;
  status: "NOMINAL" | "ADVISORY" | "CAUTION" | "WARNING";
}

interface EICASAlert {
  id: string;
  level: "WARNING" | "CAUTION" | "ADVISORY" | "STATUS";
  code: string;
  message: string;
  time: string;
  system: string;
  acknowledged: boolean;
}

type ScenarioType = "nominal" | "sensor_fault" | "combustion_degradation";

export default function GCSDashboard() {
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<"diagnostics" | "physics" | "eicas" | "telemetry">("physics");
  const [scenario, setScenario] = useState<ScenarioType>("sensor_fault");
  
  // History buffer for the Physics Residual Analysis Graph (60 data points)
  const [residualHistory, setResidualHistory] = useState<{ actual: number; expected: number }[]>([]);

  // Telemetry generator based on active scenario
  const generateTelemetry = (tTick: number, sc: ScenarioType): Telemetry => {
    const t = tTick * 0.5;
    const baseRpm = 5120 + Math.sin(t * 0.05) * 30;
    const baseMap = 128.5 + Math.sin(t * 0.02) * 2;
    const baseFuel = 28.4 + Math.sin(t * 0.03) * 0.4;
    const alt = 4850 + Math.sin(t * 0.01) * 40;
    const ambient = -14.2;

    if (sc === "sensor_fault") {
      // SCENARIO A: Sensor Fault. EGT on Cyl 3 spikes to 935°C, but CHT, Fuel, RPM remain completely nominal
      return {
        rpm: Math.round(baseRpm),
        map: baseMap,
        fuelFlow: baseFuel,
        oilPressure: 4.8,
        oilTemp: 92.1,
        cht: [138, 140, 141, 139],
        egt: [742, 739, 935, 744], // Erroneous single-point spike (+195°C)
        vibration: 1.42,
        altitude: alt,
        throttle: 84,
        missionTime: t,
        injectionTiming: 18.2,
        ambientTemp: ambient,
      };
    } else if (sc === "combustion_degradation") {
      // SCENARIO B: Combustion Degradation. Multi-channel physical shift (Lean burn: CHT high, EGT low, fuel starved)
      return {
        rpm: Math.round(baseRpm - 90),
        map: baseMap,
        fuelFlow: baseFuel - 2.6, // Starvation
        oilPressure: 4.7,
        oilTemp: 93.4,
        cht: [141, 142, 164, 140], // C3 Heat soak
        egt: [738, 735, 680, 740], // C3 Lean quench drop
        vibration: 1.88,
        altitude: alt,
        throttle: 84,
        missionTime: t,
        injectionTiming: 19.5,
        ambientTemp: ambient,
      };
    } else {
      // NOMINAL CRUISE
      return {
        rpm: Math.round(baseRpm),
        map: baseMap,
        fuelFlow: baseFuel,
        oilPressure: 4.8,
        oilTemp: 92.0,
        cht: [138, 139, 140, 139],
        egt: [742, 740, 741, 743],
        vibration: 1.38,
        altitude: alt,
        throttle: 84,
        missionTime: t,
        injectionTiming: 18.0,
        ambientTemp: ambient,
      };
    }
  };

  const [tel, setTel] = useState<Telemetry>(() => generateTelemetry(0, scenario));

  // Compute 0D thermodynamic expectation
  const computePhysics = (t: Telemetry, sc: ScenarioType): PhysicsBaseline => {
    const expectedCombustionEff = 36.8;
    let observedCombustionEff = 36.6;
    if (sc === "combustion_degradation") {
      observedCombustionEff = 31.9;
    } else if (sc === "sensor_fault") {
      // Real physical combustion efficiency is unchanged because the engine is actually healthy
      observedCombustionEff = 36.5;
    }

    return {
      expectedCHT: [138, 139, 140, 139],
      expectedEGT: [740, 740, 740, 740],
      expectedOilTemp: 91.5,
      expectedOilPress: 4.8,
      expectedFuelFlow: 28.2,
      expectedCombustionEff,
      observedCombustionEff,
      efficiencyResidual: Number((expectedCombustionEff - observedCombustionEff).toFixed(1)),
    };
  };

  const [base, setBase] = useState<PhysicsBaseline>(() => computePhysics(generateTelemetry(0, scenario), scenario));

  // Telemetry clock cycle
  useEffect(() => {
    const iv = setInterval(() => {
      setTick((prev) => {
        const next = prev + 1;
        const currentTel = generateTelemetry(next, scenario);
        const currentBase = computePhysics(currentTel, scenario);
        setTel(currentTel);
        setBase(currentBase);

        // Update residual trend buffer (EGT Cyl 3)
        setResidualHistory((h) => [
          ...h.slice(-35),
          { actual: currentTel.egt[2], expected: currentBase.expectedEGT[2] },
        ]);

        return next;
      });
    }, 500);
    return () => clearInterval(iv);
  }, [scenario]);

  // Derive Physics Residual Table
  const residualTable: ResidualItem[] = [
    {
      param: "Cyl 3 EGT (Exhaust Temp)",
      unit: "°C",
      actual: tel.egt[2],
      expected: base.expectedEGT[2],
      residual: Number((tel.egt[2] - base.expectedEGT[2]).toFixed(1)),
      tolerance: 20.0,
      isInconsistent: Math.abs(tel.egt[2] - base.expectedEGT[2]) > 20.0,
    },
    {
      param: "Cyl 3 CHT (Head Temp)",
      unit: "°C",
      actual: tel.cht[2],
      expected: base.expectedCHT[2],
      residual: Number((tel.cht[2] - base.expectedCHT[2]).toFixed(1)),
      tolerance: 6.0,
      isInconsistent: Math.abs(tel.cht[2] - base.expectedCHT[2]) > 6.0,
    },
    {
      param: "Fuel Mass Flow",
      unit: "L/h",
      actual: Number(tel.fuelFlow.toFixed(1)),
      expected: base.expectedFuelFlow,
      residual: Number((tel.fuelFlow - base.expectedFuelFlow).toFixed(1)),
      tolerance: 1.2,
      isInconsistent: Math.abs(tel.fuelFlow - base.expectedFuelFlow) > 1.2,
    },
    {
      param: "Engine RPM",
      unit: "RPM",
      actual: tel.rpm,
      expected: 5120,
      residual: tel.rpm - 5120,
      tolerance: 60,
      isInconsistent: Math.abs(tel.rpm - 5120) > 60,
    },
    {
      param: "Oil Sump Pressure",
      unit: "bar",
      actual: Number(tel.oilPressure.toFixed(1)),
      expected: base.expectedOilPress,
      residual: Number((tel.oilPressure - base.expectedOilPress).toFixed(1)),
      tolerance: 0.4,
      isInconsistent: Math.abs(tel.oilPressure - base.expectedOilPress) > 0.4,
    },
    {
      param: "Oil Delivery Temp",
      unit: "°C",
      actual: Number(tel.oilTemp.toFixed(1)),
      expected: base.expectedOilTemp,
      residual: Number((tel.oilTemp - base.expectedOilTemp).toFixed(1)),
      tolerance: 2.5,
      isInconsistent: Math.abs(tel.oilTemp - base.expectedOilTemp) > 2.5,
    },
  ];

  // Derive Systemic Scores
  let physicsScore = 98;
  let stateConfidence = 96;
  let diagnosisHeader = "SYSTEMS NOMINAL // IN ENVELOPE";
  let diagnosisSub = "All sensor observations track within thermodynamic 0D state boundary.";
  let statusBannerColor = "#22c55e";

  if (scenario === "sensor_fault") {
    physicsScore = 41;
    stateConfidence = 94; // Model is confident that the engine is fine and the sensor is bad
    diagnosisHeader = "PHYSICAL INCONSISTENCY // LIKELY SENSOR FAULT (CYL 3 EGT PROBE)";
    diagnosisSub = "EGT thermocouple indicates +195°C excursion without correlating enthalpy increase in CHT, fuel flow, or thermal soak. Physics equations reject overheat hypothesis. False abort command suppressed.";
    statusBannerColor = "#f59e0b";
  } else if (scenario === "combustion_degradation") {
    physicsScore = 32;
    stateConfidence = 44; // Model recognizes authentic plant degradation
    diagnosisHeader = "COMBUSTION DEGRADATION // CORRELATED MULTI-CHANNEL DRIFT";
    diagnosisSub = "Correlated thermal divergence confirmed: localized fuel flow deficit (-2.6 L/h) coincides with CHT heat soak (+24°C) and manifold EGT deficit (-60°C). Cylinder #3 injector failure confirmed.";
    statusBannerColor = "#ef4444";
  }

  // 5 Specialized AI Models
  const aiModels: ModelDiagnostic[] = [
    {
      name: "Thermal AI",
      domain: "Thermodynamic Heat Soak",
      parameters: "CHT Cyl 1-4, Coolant Temp, Ambient ΔT",
      prediction: scenario === "combustion_degradation" ? "Cyl 3 Thermal Soak Anomaly (+24°C)" : "Thermal Rails In-Envelope",
      confidence: 94,
      status: scenario === "combustion_degradation" ? "CAUTION" : "NOMINAL",
    },
    {
      name: "Combustion AI",
      domain: "Cycle Enthalpy & Stoichiometry",
      parameters: "EGT Cyl 1-4, Fuel Mass Flow, MAP",
      prediction: scenario === "sensor_fault" ? "EGT Isolated Reading Discordant" : scenario === "combustion_degradation" ? "Cyl 3 Under-Fueling / Lean Quench" : "Stoichiometric Nominal",
      confidence: 96,
      status: scenario === "sensor_fault" ? "ADVISORY" : scenario === "combustion_degradation" ? "CAUTION" : "NOMINAL",
    },
    {
      name: "Vibration AI",
      domain: "Harmonic & Torsional Analysis",
      parameters: "Tri-Axial Accel (Crankcase/Hub)",
      prediction: scenario === "combustion_degradation" ? "Torsional Harmonic Flutter (1.88g)" : "Broadband Vibration Nominal (1.42g)",
      confidence: 89,
      status: scenario === "combustion_degradation" ? "ADVISORY" : "NOMINAL",
    },
    {
      name: "Lubrication AI",
      domain: "Hydrodynamic Boundary Film",
      parameters: "Oil Pressure (4.8 bar), Sump Temp (92°C)",
      prediction: "Nominal Viscosity Retention & Shearing",
      confidence: 97,
      status: "NOMINAL",
    },
    {
      name: "Electrical AI",
      domain: "FADEC Rail & Actuator Bus",
      parameters: "Injector Driver Bus, Spark Coil Voltage",
      prediction: "Rail Voltage Stable (28.2V DC)",
      confidence: 99,
      status: "NOMINAL",
    },
  ];

  // EICAS Alerts list
  const [alerts, setAlerts] = useState<EICASAlert[]>([
    { id: "A1", level: "WARNING", code: "ENG-WARN-0", message: "CRITICAL REDLINE CLEAR (0 ACTIVE REDLINES)", time: "12:04:18Z", system: "FADEC", acknowledged: true },
    { id: "A2", level: "CAUTION", code: "THERMO-INCON", message: "EGT SENSOR DECOUPLED FROM CHT / FUEL DYNAMICS", time: "12:04:22Z", system: "PHYSICS", acknowledged: false },
    { id: "A3", level: "ADVISORY", code: "INJ-AUTOTRIM", message: "FADEC TRIM RUNNING CLOSED-LOOP BALANCE", time: "12:04:30Z", system: "FUEL", acknowledged: false },
    { id: "A4", level: "STATUS", code: "RESIDUAL-10HZ", message: "PHYSICS-MODEL CONVERGENCE VALIDATED AT 50HZ", time: "12:05:01Z", system: "DIGITAL-TWIN", acknowledged: true },
  ]);

  const mins = Math.floor(tel.missionTime / 60);
  const secs = Math.floor(tel.missionTime % 60);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#070b10",
        color: "#e2e8f0",
        fontFamily: "Inter, sans-serif",
        overflow: "hidden",
        border: "1px solid #1e293b",
      }}
    >
      {/* ─── Top Telemetry Status Bar ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          height: 44,
          background: "#0c131d",
          borderBottom: "1px solid #1e2d3d",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 8, height: 8, background: statusBannerColor, boxShadow: `0 0 8px ${statusBannerColor}` }} />
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.15em", color: "#38bdf8" }}>
            AERODTWIN // PROPULSION GCS
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#64748b", borderLeft: "1px solid #334155", paddingLeft: 12 }}>
            AIRFRAME: MALE-UAV-BLK-II · STANAG 4586
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8" }}>
            ALT <strong style={{ color: "#fff" }}>{Math.round(tel.altitude)}</strong> m
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8" }}>
            OAT <strong style={{ color: "#38bdf8" }}>{tel.ambientTemp}°C</strong>
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8" }}>
            MET <strong style={{ color: "#fff" }}>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</strong>
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, padding: "2px 8px", background: "#38bdf820", color: "#38bdf8", border: "1px solid #38bdf850" }}>
            FADEC 50Hz CAN
          </span>
        </div>
      </div>

      {/* ─── Navigation Bar ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#0a0e14",
          borderBottom: "1px solid #1e2d3d",
          padding: "0 18px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "physics", label: "Physics-Based State Validation" },
            { id: "diagnostics", label: "Multi-Model Fusion & AI" },
            { id: "eicas", label: "EICAS & Fault Log" },
            { id: "telemetry", label: "Raw Telemetry Matrix" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "9px 18px",
                  background: isActive ? "#111a26" : "transparent",
                  border: "none",
                  borderBottom: isActive ? "3px solid #38bdf8" : "3px solid transparent",
                  color: isActive ? "#38bdf8" : "#64748b",
                  fontFamily: "Rajdhani, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Real-time Scenario Injector Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>
            TEST SCENARIO:
          </span>
          {[
            { id: "nominal", label: "Nominal" },
            { id: "sensor_fault", label: "Scenario A: Sensor Fault" },
            { id: "combustion_degradation", label: "Scenario B: Degradation" },
          ].map((sc) => (
            <button
              key={sc.id}
              onClick={() => setScenario(sc.id as ScenarioType)}
              style={{
                padding: "3px 8px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                fontWeight: 700,
                background: scenario === sc.id ? "#38bdf825" : "#0d131d",
                color: scenario === sc.id ? "#38bdf8" : "#64748b",
                border: `1px solid ${scenario === sc.id ? "#38bdf8" : "#1e293b"}`,
                cursor: "pointer",
              }}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Content Views ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        
        {/* ══════════════════════════════════════════════════════════════════
            TAB: PHYSICS-BASED ENGINE STATE VALIDATION
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "physics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            
            {/* ─── Top Banner: Diagnostics & Score Badges ─── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 220px 220px",
                gap: 10,
              }}
            >
              {/* Classification Alert Box */}
              <div
                style={{
                  background: "#0c131e",
                  border: `1px solid ${statusBannerColor}`,
                  borderLeft: `5px solid ${statusBannerColor}`,
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: statusBannerColor, letterSpacing: "0.15em", fontWeight: 700 }}>
                  DIAGNOSTIC VERDICT:
                </div>
                <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 19, fontWeight: 800, color: "#f8fafc", letterSpacing: "0.05em" }}>
                  {diagnosisHeader}
                </div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>
                  {diagnosisSub}
                </div>
              </div>

              {/* Physics Consistency Score */}
              <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 11, letterSpacing: "0.15em", color: "#64748b", textTransform: "uppercase" }}>
                  PHYSICS CONSISTENCY SCORE
                </div>
                <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 32, fontWeight: 800, color: physicsScore > 75 ? "#22c55e" : physicsScore > 45 ? "#f59e0b" : "#ef4444", lineHeight: 1.1 }}>
                  {physicsScore}<span style={{ fontSize: 14, color: "#64748b" }}>%</span>
                </div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b", marginTop: 2 }}>
                  {physicsScore > 75 ? "CONSERVATION LAWS BALANCED" : "LOCALIZED EQUATION DRIFT"}
                </div>
              </div>

              {/* Engine State Confidence */}
              <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 11, letterSpacing: "0.15em", color: "#64748b", textTransform: "uppercase" }}>
                  ENGINE STATE CONFIDENCE
                </div>
                <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 32, fontWeight: 800, color: stateConfidence > 75 ? "#38bdf8" : "#f59e0b", lineHeight: 1.1 }}>
                  {stateConfidence}<span style={{ fontSize: 14, color: "#64748b" }}>%</span>
                </div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b", marginTop: 2 }}>
                  OBSERVER CERTAINTY LEVEL
                </div>
              </div>
            </div>

            {/* ─── Virtual Engine Model Schematic ─── */}
            <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e2d3d", paddingBottom: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#38bdf8", textTransform: "uppercase" }}>
                  VIRTUAL ENGINE MODEL ARCHITECTURE // 0D THERMODYNAMIC CYCLE KERNEL
                </span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#64748b" }}>
                  CONSERVATION OF MASS & ENERGY SOLVER (20ms CYCLE)
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr", gap: 12, alignItems: "center" }}>
                
                {/* Inputs to Physics Model */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#38bdf8", fontWeight: 700, letterSpacing: "0.1em" }}>
                    INCOMING SENSOR STREAMS (FADEC)
                  </div>
                  {[
                    { l: "Engine RPM", v: `${tel.rpm} RPM` },
                    { l: "Fuel Mass Flow Rate", v: `${tel.fuelFlow.toFixed(1)} L/h` },
                    { l: "Injection Timing", v: `${tel.injectionTiming.toFixed(1)}° BTDC` },
                    { l: "Manifold Pressure (MAP)", v: `${tel.map.toFixed(1)} kPa` },
                    { l: "Altitude & Ambient Temp", v: `${Math.round(tel.altitude)}m / ${tel.ambientTemp}°C` },
                    { l: "Oil Press & Temp", v: `${tel.oilPressure.toFixed(1)} bar / ${tel.oilTemp.toFixed(0)}°C` },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#080c10",
                        border: "1px solid #1a2535",
                        padding: "4px 8px",
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 9,
                      }}
                    >
                      <span style={{ color: "#64748b" }}>{item.l}</span>
                      <span style={{ color: "#f8fafc", fontWeight: 600 }}>{item.v}</span>
                    </div>
                  ))}
                </div>

                {/* Central 0D Thermodynamic Kernel Block */}
                <div
                  style={{
                    background: "#080d14",
                    border: "1px solid #38bdf840",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 10px #38bdf8", marginBottom: 6 }} />
                  <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "0.1em" }}>
                    PHYSICS TWIN ENGINE
                  </div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#38bdf8", marginBottom: 8 }}>
                    0D MEAN-VALUE THERMODYNAMICS
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, width: "100%", textAlign: "left", fontSize: 8, fontFamily: "JetBrains Mono, monospace" }}>
                    <div style={{ background: "#0c131d", padding: "4px 6px", border: "1px solid #1e293b", color: "#94a3b8" }}>
                      HEAT RELEASE: <span style={{ color: "#fff" }}>WIEBE FUNCTION</span>
                    </div>
                    <div style={{ background: "#0c131d", padding: "4px 6px", border: "1px solid #1e293b", color: "#94a3b8" }}>
                      HEAT TRANSFER: <span style={{ color: "#fff" }}>WOSCHNI EQ</span>
                    </div>
                    <div style={{ background: "#0c131d", padding: "4px 6px", border: "1px solid #1e293b", color: "#94a3b8" }}>
                      EXP EFFICIENCY: <span style={{ color: "#38bdf8" }}>{base.expectedCombustionEff}%</span>
                    </div>
                    <div style={{ background: "#0c131d", padding: "4px 6px", border: "1px solid #1e293b", color: "#94a3b8" }}>
                      OBS EFFICIENCY: <span style={{ color: scenario === "combustion_degradation" ? "#ef4444" : "#22c55e" }}>{base.observedCombustionEff}%</span>
                    </div>
                  </div>
                </div>

                {/* Predicted States Coming Out */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#22c55e", fontWeight: 700, letterSpacing: "0.1em" }}>
                    PREDICTED THERMODYNAMIC STATES
                  </div>
                  {[
                    { l: "Expected EGT (Cyl 1-4)", v: `${base.expectedEGT[2]}°C Nominal` },
                    { l: "Expected CHT (Cyl 1-4)", v: `${base.expectedCHT[2]}°C Nominal` },
                    { l: "Expected Fuel Burn", v: `${base.expectedFuelFlow} L/h` },
                    { l: "Expected Oil Press/Temp", v: `${base.expectedOilPress} bar / ${base.expectedOilTemp}°C` },
                    { l: "Efficiency Residual (Δ)", v: `+${base.efficiencyResidual}%` },
                    { l: "Cycle State Validity", v: scenario === "sensor_fault" ? "DECOUPLED (1 CH)" : scenario === "combustion_degradation" ? "DEGRADED" : "COHERENT" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#080c10",
                        border: "1px solid #1a2535",
                        padding: "4px 8px",
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 9,
                      }}
                    >
                      <span style={{ color: "#64748b" }}>{item.l}</span>
                      <span style={{ color: "#38bdf8", fontWeight: 600 }}>{item.v}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* ─── Bottom Split: Residual Table & Dynamic Graph ─── */}
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 10 }}>
              
              {/* Residual Comparison Table */}
              <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e2d3d", paddingBottom: 6, marginBottom: 8 }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#38bdf8", textTransform: "uppercase" }}>
                    PHYSICS-BASED ENGINE STATE VALIDATION TABLE
                  </span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#64748b" }}>
                    Δ = ACTUAL − EXPECTED
                  </span>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "JetBrains Mono, monospace", fontSize: 9 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b", color: "#64748b", textAlign: "left" }}>
                      <th style={{ padding: "6px 4px" }}>PARAMETER</th>
                      <th style={{ padding: "6px 4px" }}>ACTUAL SENSOR</th>
                      <th style={{ padding: "6px 4px" }}>PHYSICS EXPECTED</th>
                      <th style={{ padding: "6px 4px" }}>RESIDUAL (Δ)</th>
                      <th style={{ padding: "6px 4px", textAlign: "right" }}>PHYSICAL STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residualTable.map((row, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid #121a24",
                          background: row.isInconsistent ? "rgba(239, 68, 68, 0.08)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "6px 4px", color: row.isInconsistent ? "#fca5a5" : "#e2e8f0" }}>{row.param}</td>
                        <td style={{ padding: "6px 4px", color: row.isInconsistent ? "#ef4444" : "#fff", fontWeight: 700 }}>
                          {row.actual} {row.unit}
                        </td>
                        <td style={{ padding: "6px 4px", color: "#94a3b8" }}>
                          {row.expected} {row.unit}
                        </td>
                        <td style={{ padding: "6px 4px", color: row.isInconsistent ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
                          {row.residual >= 0 ? `+${row.residual}` : row.residual} {row.unit}
                        </td>
                        <td style={{ padding: "6px 4px", textAlign: "right" }}>
                          <span
                            style={{
                              padding: "2px 6px",
                              fontSize: 8,
                              fontWeight: 700,
                              background: row.isInconsistent ? "#ef444425" : "#22c55e25",
                              border: `1px solid ${row.isInconsistent ? "#ef4444" : "#22c55e"}`,
                              color: row.isInconsistent ? "#ef4444" : "#22c55e",
                            }}
                          >
                            {row.isInconsistent ? "INCONSISTENCY" : "NOMINAL"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Physics Residual Analysis Graph */}
              <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: 12, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e2d3d", paddingBottom: 6, marginBottom: 8 }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#38bdf8", textTransform: "uppercase" }}>
                    PHYSICS RESIDUAL ANALYSIS (CYL 3 EGT)
                  </span>
                  <div style={{ display: "flex", gap: 8, fontFamily: "JetBrains Mono, monospace", fontSize: 8 }}>
                    <span style={{ color: "#ef4444" }}>● MEASURED</span>
                    <span style={{ color: "#38bdf8" }}>● EXPECTED</span>
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: 140, background: "#070b10", border: "1px solid #1a2535", position: "relative", overflow: "hidden", padding: 8 }}>
                  {/* SVG Line Graph */}
                  <svg viewBox="0 0 300 130" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                    {/* Tolerance corridor */}
                    <rect x="0" y="45" width="300" height="40" fill="rgba(56, 189, 248, 0.08)" />
                    <line x1="0" y1="65" x2="300" y2="65" stroke="#38bdf8" strokeDasharray="3,3" strokeWidth="0.8" opacity="0.4" />

                    {/* Plot Expected */}
                    <polyline
                      points={residualHistory.map((pt, i) => `${(i / (residualHistory.length - 1 || 1)) * 300},65`).join(" ")}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />

                    {/* Plot Actual */}
                    <polyline
                      points={residualHistory
                        .map((pt, i) => {
                          const delta = pt.actual - 740;
                          const y = Math.max(10, Math.min(120, 65 - delta * 0.35));
                          return `${(i / (residualHistory.length - 1 || 1)) * 300},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke={scenario === "nominal" ? "#22c55e" : "#ef4444"}
                      strokeWidth="2"
                    />
                  </svg>

                  <div style={{ position: "absolute", bottom: 4, right: 6, fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>
                    WINDOW: 35s TIME-SERIES · ±20°C ENVELOPE
                  </div>
                </div>

                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>
                  Isolated departures exceeding the ±20°C envelope without corresponding CHT gradient indicate non-physical thermocouple drift.
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: MULTI-MODEL FUSION & AI
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "diagnostics" && (
          <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              
              <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, borderBottom: "1px solid #1e2d3d", paddingBottom: 6 }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#38bdf8" }}>
                    MULTI-MODEL ENGINE DIAGNOSTICS
                  </span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#64748b" }}>5 INDEPENDENT AI INFERENCES</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {aiModels.map((m) => (
                    <div
                      key={m.name}
                      style={{
                        background: "#080c10",
                        border: "1px solid #182230",
                        padding: "8px 10px",
                        display: "grid",
                        gridTemplateColumns: "1.4fr 2.5fr 0.8fr 0.8fr",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 12, color: "#f8fafc" }}>{m.name}</div>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>{m.domain}</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: m.status !== "NOMINAL" ? "#fbbf24" : "#94a3b8" }}>
                          {m.prediction}
                        </div>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#475569" }}>Params: {m.parameters}</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#f8fafc" }}>{m.confidence}%</div>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#475569" }}>CONFIDENCE</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ padding: "2px 6px", fontSize: 9, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, background: m.status === "NOMINAL" ? "#22c55e20" : "#f59e0b20", color: m.status === "NOMINAL" ? "#22c55e" : "#f59e0b", border: `1px solid ${m.status === "NOMINAL" ? "#22c55e" : "#f59e0b"}` }}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Central Intelligent Fusion Engine */}
              <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: 12, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e2d3d", paddingBottom: 6 }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#f59e0b" }}>
                    INTELLIGENT FUSION ENGINE
                  </span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#22c55e" }}>● BAYESIAN HARMONIZATION</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                  <div style={{ background: "#090d14", border: "1px solid #1e293b", padding: "6px 8px" }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>AI ENSEMBLE WEIGHT</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>94.2%</div>
                  </div>
                  <div style={{ background: "#090d14", border: "1px solid #1e293b", padding: "6px 8px" }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>PHYSICS MODEL MATCH</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>{physicsScore}%</div>
                  </div>
                  <div style={{ background: "#090d14", border: "1px solid #1e293b", padding: "6px 8px" }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>SENSOR CONFIDENCE</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{stateConfidence}%</div>
                  </div>
                </div>

                <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid #f59e0b", padding: "12px 14px", marginTop: "auto" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#f59e0b", fontWeight: 700, letterSpacing: "0.2em" }}>
                    DIGITAL TWIN CONSOLIDATED DIAGNOSIS:
                  </div>
                  <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 20, fontWeight: 800, color: "#fbbf24" }}>
                    {scenario === "combustion_degradation" ? "PROBABLE INJECTOR DEGRADATION — 93% CONFIDENCE" : scenario === "sensor_fault" ? "PHYSICAL INCONSISTENCY — SENSOR DEFECT DETECTED" : "NOMINAL PROPULSION HEALTH — 98% CONFIDENCE"}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Mini Physics Validation & RUL */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: 12 }}>
                <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#38bdf8", marginBottom: 10, borderBottom: "1px solid #1e2d3d", paddingBottom: 6 }}>
                  PHYSICS VALIDATION RESIDUAL
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div style={{ background: "#080c10", padding: "8px", border: "1px solid #182230" }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>EXP EFF</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15, fontWeight: 700, color: "#fff" }}>{base.expectedCombustionEff}%</div>
                  </div>
                  <div style={{ background: "#080c10", padding: "8px", border: "1px solid #182230" }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>OBS EFF</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15, fontWeight: 700, color: "#fbbf24" }}>{base.observedCombustionEff}%</div>
                  </div>
                  <div style={{ background: "#080c10", padding: "8px", border: "1px solid #182230" }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>RESIDUAL</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15, fontWeight: 700, color: base.efficiencyResidual > 1 ? "#ef4444" : "#22c55e" }}>+{base.efficiencyResidual}%</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: 12, flex: 1 }}>
                <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#38bdf8", marginBottom: 10, borderBottom: "1px solid #1e2d3d", paddingBottom: 6 }}>
                  PROPULSION HEALTH INDEX & RISK
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "#080c10", padding: "10px", border: "1px solid #182230" }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>HEALTH INDEX</div>
                    <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 28, fontWeight: 800, color: scenario === "combustion_degradation" ? "#ef4444" : "#22c55e" }}>
                      {scenario === "combustion_degradation" ? "68" : "94"}<span style={{ fontSize: 14, color: "#64748b" }}>/100</span>
                    </div>
                  </div>
                  <div style={{ background: "#080c10", padding: "10px", border: "1px solid #182230" }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#64748b" }}>RUL PROJECTION</div>
                    <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 28, fontWeight: 800, color: "#38bdf8" }}>
                      {scenario === "combustion_degradation" ? "48.5" : "264"}<span style={{ fontSize: 12, color: "#64748b" }}> HRS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: EICAS & FAULT LOG
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "eicas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { title: "WARNING", count: 0, desc: "Immediate Action Required", border: "#ef4444", active: false },
                { title: "CAUTION", count: scenario === "nominal" ? 0 : 1, desc: "Crew Awareness Required", border: "#f59e0b", active: scenario !== "nominal" },
                { title: "ADVISORY", count: 1, desc: "Crew Information", border: "#38bdf8", active: true },
                { title: "STATUS", count: 2, desc: "Equipment Nominal State", border: "#22c55e", active: true },
              ].map((tier) => (
                <div key={tier.title} style={{ background: tier.active ? `${tier.border}15` : "#0c131e", border: `1px solid ${tier.border}${tier.active ? "99" : "33"}`, padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, fontWeight: 700, color: tier.border }}>{tier.title}</div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#64748b" }}>{tier.desc}</div>
                  </div>
                  <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 32, fontWeight: 800, color: tier.border }}>{tier.count}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e2d3d", paddingBottom: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>ACTIVE EICAS CREW ALERTS</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#64748b" }}>STANAG 4586 AUDIT</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {alerts.map((a) => {
                  const alertColor = a.level === "WARNING" ? "#ef4444" : a.level === "CAUTION" ? "#f59e0b" : a.level === "ADVISORY" ? "#38bdf8" : "#22c55e";
                  return (
                    <div key={a.id} style={{ background: "#080c10", border: `1px solid ${alertColor}40`, borderLeft: `4px solid ${alertColor}`, padding: "10px 14px", display: "grid", gridTemplateColumns: "1.2fr 1.5fr 4fr 1fr 1.2fr", alignItems: "center", gap: 12 }}>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: alertColor }}>[{a.level}]</div>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#fff" }}>{a.code}</div>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#cbd5e1" }}>{a.message}</div>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#64748b" }}>{a.time}</div>
                      <div style={{ textAlign: "right" }}>
                        <button onClick={() => setAlerts(alerts.map((it) => it.id === a.id ? { ...it, acknowledged: !it.acknowledged } : it))} style={{ background: a.acknowledged ? "#1e293b" : `${alertColor}20`, border: `1px solid ${a.acknowledged ? "#475569" : alertColor}`, color: a.acknowledged ? "#94a3b8" : alertColor, fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700, padding: "4px 8px", cursor: "pointer" }}>
                          {a.acknowledged ? "ACKNOWLEDGED" : "ACK ALERT"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: RAW TELEMETRY MATRIX
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "telemetry" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#0c131e", border: "1px solid #1e2d3d", padding: 14 }}>
              <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, fontWeight: 700, color: "#38bdf8", marginBottom: 10, borderBottom: "1px solid #1e2d3d", paddingBottom: 6 }}>
                BOXER-4 CYLINDER TELEMETRY MATRIX
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ background: "#080c10", border: "1px solid #1e293b", padding: "10px" }}>
                    <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                      CYLINDER #{i + 1}
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 }}>
                      <div>CHT: <strong style={{ color: "#fff" }}>{Math.round(tel.cht[i])}°C</strong></div>
                      <div>EGT: <strong style={{ color: tel.egt[i] > 850 ? "#ef4444" : "#fff" }}>{Math.round(tel.egt[i])}°C</strong></div>
                      <div>Δ CHT: <span style={{ color: "#22c55e" }}>+{(tel.cht[i] - base.expectedCHT[i]).toFixed(1)}°C</span></div>
                      <div>Δ EGT: <span style={{ color: Math.abs(tel.egt[i] - base.expectedEGT[i]) > 20 ? "#ef4444" : "#22c55e" }}>{(tel.egt[i] - base.expectedEGT[i]).toFixed(1)}°C</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 18px",
          borderTop: "1px solid #1e2d3d",
          background: "#080c10",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          color: "#475569",
          flexShrink: 0,
        }}
      >
        <span>PHYSICS ENGINE: 0D MEAN-VALUE THERMODYNAMICS (50 Hz CYCLE)</span>
        <span>EDGE ACCELERATOR: JETSON ORIN NX (LATENCY: 8.4ms)</span>
        <span>SECURITY: UNCLASSIFIED // NATO STANAG-4586 COMPLIANT</span>
      </div>
    </div>
  );
}