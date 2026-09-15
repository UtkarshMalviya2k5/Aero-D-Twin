import { useState, useEffect } from "react";

// ─── GCS Dashboard ────────────────────────────────────────────────────────────
import GCSDashboard from "./GCSDashboard";

// ─── 3D Engine Viewer ─────────────────────────────────────────────────────────
import Engine3D from "./Engine3D.tsx";

// ─── EICAS View ───────────────────────────────────────────────────────────────
import EICASView from "./EICASView.tsx";

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Navbar({
  onLaunchGCS,
  onLaunchEngine,
  onLaunchEICAS,
}: {
  onLaunchGCS: () => void;
  onLaunchEngine: () => void;
  onLaunchEICAS: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);

    window.addEventListener("scroll", fn);

    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center h-16 gap-8">

        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 relative">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="w-full h-full"
            >
              <polygon
                points="16,2 30,10 30,22 16,30 2,22 2,10"
                fill="#0f2547"
              />

              <polygon
                points="16,7 25,12 25,20 16,25 7,20 7,12"
                fill="#0ea5e9"
                opacity="0.5"
              />

              <circle
                cx="16"
                cy="16"
                r="3.5"
                fill="white"
              />
            </svg>
          </div>

          <span className="font-display font-700 text-lg tracking-[0.08em] text-navy">
            Aero<span style={{ color: "#0ea5e9" }}>DTwin</span>
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {["About", "Solutions", "Features", "Testimonials"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="nav-link"
            >
              {l}
            </a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3 ml-auto">

          <button
            className="font-display text-xs font-700 tracking-widest uppercase text-slate-500 hover:text-navy transition-colors px-3 py-1.5"
          >
            Sign In
          </button>

          <button
            className="btn-outline text-xs py-2 px-4"
            onClick={onLaunchEngine}
          >
            3D Engine
          </button>

          <button
            className="btn-outline text-xs py-2 px-4"
            onClick={onLaunchEICAS}
          >
            EICAS
          </button>

          <button
            className="btn-primary text-xs py-2 px-4"
            onClick={onLaunchGCS}
          >
            Launch GCS ›
          </button>

        </div>

        {/* Hamburger */}
        <button
          className="md:hidden ml-auto flex flex-col gap-1.5 p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span
            className={`block w-5 h-0.5 bg-navy transition-all duration-200 ${
              menuOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />

          <span
            className={`block w-5 h-0.5 bg-navy transition-all duration-200 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />

          <span
            className={`block w-5 h-0.5 bg-navy transition-all duration-200 ${
              menuOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 flex flex-col gap-4">

          {["About", "Solutions", "Features", "Testimonials"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="font-display text-sm font-600 tracking-wider text-slate-600 uppercase"
              onClick={() => setMenuOpen(false)}
            >
              {l}
            </a>
          ))}

          <button
            className="btn-outline w-full justify-center mt-2"
            onClick={() => {
              setMenuOpen(false);
              onLaunchEngine();
            }}
          >
            Open 3D Engine
          </button>

          <button
            className="btn-outline w-full justify-center"
            onClick={() => {
              setMenuOpen(false);
              onLaunchEICAS();
            }}
          >
            EICAS
          </button>

          <button
            className="btn-primary w-full justify-center"
            onClick={() => {
              setMenuOpen(false);
              onLaunchGCS();
            }}
          >
            Launch GCS
          </button>

        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({
  onLaunchGCS,
  onLaunchEngine,
  onLaunchEICAS,
}: {
  onLaunchGCS: () => void;
  onLaunchEngine: () => void;
  onLaunchEICAS: () => void;
}) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100svh" }}
    >

      {/* Background Image */}
      <div className="absolute inset-0">

        <img
          src="https://images.unsplash.com/photo-1511674294200-df1c0668e87d?w=1600&h=900&fit=crop&auto=format"
          alt="UAV drone in flight"
          className="w-full h-full object-cover"
        />

        {/* Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(15,37,71,0.88) 0%, rgba(15,37,71,0.55) 50%, rgba(15,37,71,0.3) 100%)",
          }}
        />

        {/* Bottom Fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40"
          style={{
            background:
              "linear-gradient(to bottom, transparent, #f8fafc)",
          }}
        />

      </div>

      {/* Watermark */}
      <div className="hero-watermark">
        <span className="hero-watermark-text">
          AeroDTwin
        </span>
      </div>

      {/* Content */}
      <div
        className="relative max-w-7xl mx-auto px-6 flex flex-col justify-center"
        style={{
          minHeight: "100svh",
          paddingTop: "6rem",
          paddingBottom: "5rem",
        }}
      >

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          {/* Left */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            <div
              className="section-tag"
              style={{
                background: "rgba(14,165,233,0.15)",
                color: "#7dd3fc",
              }}
            >
              <span className="blink">▮</span>
              Digital Twin Technology
            </div>

            <h1
              className="font-display font-700 leading-[1.05] text-white"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4.25rem)",
                letterSpacing: "0.01em",
              }}
            >
              What the Future
              <br />
              Holds for
              <br />
              <span style={{ color: "#38bdf8" }}>
                UAV Propulsion
              </span>
            </h1>

            <p
              className="text-slate-300 leading-relaxed max-w-md"
              style={{
                fontSize: "clamp(0.9rem, 1.5vw, 1rem)",
              }}
            >
              Indigenous AI-driven Digital Twin framework delivering
              real-time thermodynamic analysis, predictive fault
              detection, and Remaining Useful Life estimation for
              MALE-class UAV piston engines.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">

              <button
                className="btn-primary"
                onClick={onLaunchGCS}
              >
                Launch GCS Dashboard

                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M1 7H13M8 2L13 7L8 12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                className="btn-outline"
                onClick={onLaunchEngine}
                style={{
                  borderColor: "rgba(255,255,255,0.4)",
                  color: "white",
                }}
              >
                Explore 3D Engine
              </button>

              <button
                className="btn-outline"
                onClick={onLaunchEICAS}
                style={{
                  borderColor: "rgba(255,255,255,0.4)",
                  color: "white",
                }}
              >
                EICAS
              </button>

            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4 border-t border-white/10">

              {[
                {
                  val: "12ms",
                  label: "Edge Latency",
                },
                {
                  val: "99.2%",
                  label: "Fault Detection",
                },
                {
                  val: "280h",
                  label: "TBO Coverage",
                },
              ].map((s) => (
                <div key={s.label}>

                  <div className="font-display text-2xl font-700 text-white">
                    {s.val}
                  </div>

                  <div className="font-mono text-[10px] text-slate-400 tracking-wider uppercase">
                    {s.label}
                  </div>

                </div>
              ))}

            </div>
          </div>

          {/* Right Feature Card */}
          <div className="lg:col-span-5 flex justify-end">

            <div className="w-72 bg-white/10 backdrop-blur-sm border border-white/20 p-5 rounded-sm">

              <div className="flex items-center gap-2 mb-4">

                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />

                <span className="font-mono text-[10px] text-sky-300 tracking-widest">
                  LIVE TELEMETRY
                </span>

              </div>

              <img
                src="https://images.unsplash.com/flagged/photo-1579750481098-8b3a62c9b85d?w=400&h=220&fit=crop&auto=format"
                alt="Cockpit instrument panel"
                className="w-full rounded-sm mb-4 object-cover"
                style={{ height: 140 }}
              />

              <div className="font-display text-lg font-700 text-white mb-1">
                Next-Gen Engine
                <br />
                Monitoring Platform
              </div>

              <div className="font-mono text-[10px] text-slate-300 leading-relaxed">
                Physics + AI/ML hybrid — real-time CHT, EGT, RUL
                estimation across all cylinder banks.
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">

                {[
                  {
                    label: "HI",
                    val: "94%",
                    color: "#22c55e",
                  },
                  {
                    label: "RUL",
                    val: "263h",
                    color: "#38bdf8",
                  },
                  {
                    label: "FAULTS",
                    val: "0",
                    color: "#22c55e",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="bg-white/10 p-2 text-center rounded-sm"
                  >
                    <div
                      className="font-mono text-xs font-700"
                      style={{ color: m.color }}
                    >
                      {m.val}
                    </div>

                    <div className="font-mono text-[8px] text-slate-400">
                      {m.label}
                    </div>
                  </div>
                ))}

              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Scroll */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50">

        <div className="w-5 h-8 rounded-full border border-slate-400 flex justify-center pt-1.5">

          <div className="w-0.5 h-2 bg-slate-300 rounded-full animate-bounce" />

        </div>

      </div>
    </section>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    {
      val: "500+",
      label: "Active Deployments",
      sub: "field-proven MALE UAV rigs",
    },
    {
      val: "4.9",
      label: "Mission Reliability",
      sub: "stars across GCS operators",
      stars: true,
    },
    {
      val: "87%",
      label: "Maintenance Savings",
      sub: "vs. schedule-based overhauls",
    },
    {
      val: "<2ms",
      label: "Physics Computation",
      sub: "0D thermodynamic baseline",
    },
  ];

  return (
    <section
      className="bg-white border-y border-slate-100"
      id="about"
    >
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-slate-100">

        {stats.map((s, i) => (
          <div
            key={i}
            className={`flex flex-col gap-2 ${
              i > 0 ? "pl-8" : ""
            }`}
          >

            {s.stars && (
              <div className="flex gap-0.5">

                {[...Array(5)].map((_, j) => (
                  <svg
                    key={j}
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="#f59e0b"
                  >
                    <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 2 .7-4.1-3-2.9 4.2-.7L7 1z" />
                  </svg>
                ))}

              </div>
            )}

            <div className="stat-number">
              {s.val}
            </div>

            <div>
              <div className="font-display text-sm font-600 text-navy tracking-wide">
                {s.label}
              </div>

              <div className="text-xs text-slate-400 mt-0.5">
                {s.sub}
              </div>
            </div>

          </div>
        ))}

      </div>
    </section>
  );
}

// ─── Solutions ────────────────────────────────────────────────────────────────
function Solutions() {
  return (
    <section
      id="solutions"
      className="bg-slate-50 py-24"
    >
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          <div>

            <div className="section-tag mb-5">
              Our Architecture
            </div>

            <h2 className="font-display font-700 text-4xl lg:text-5xl text-navy leading-tight mb-6">
              Physics + AI.
              <br />
              <span className="gradient-text">
                One unified engine.
              </span>
            </h2>

            <p className="text-slate-500 leading-relaxed mb-8 max-w-lg">
              AeroDTwin combines edge CAN 2.0B telemetry ingestion,
              real-time 0D thermodynamic physics modelling, and
              AI/ML anomaly detection into a single containerized
              stack — operating at ground control stations and
              bench test rigs alike.
            </p>

            <div className="flex flex-col gap-4">

              {[
                {
                  icon: "◈",
                  title: "Edge Telemetry",
                  desc: "SAE J1939 / FADEC parsing — RPM, CHT×4, EGT×4, oil, fuel at 50 Hz",
                },
                {
                  icon: "△",
                  title: "Physics Baseline",
                  desc: "0D mean-value thermodynamics computing expected thermal states under real load",
                },
                {
                  icon: "⬡",
                  title: "AI Prognostics",
                  desc: "Autoencoder + Isolation Forest anomaly scoring, LSTM-based RUL extrapolation",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 items-start"
                >

                  <div className="feature-icon-ring shrink-0">
                    <span className="text-sky-600 text-lg">
                      {item.icon}
                    </span>
                  </div>

                  <div>
                    <div className="font-display font-700 text-sm tracking-wide text-navy uppercase mb-0.5">
                      {item.title}
                    </div>

                    <div className="text-sm text-slate-500 leading-relaxed">
                      {item.desc}
                    </div>
                  </div>

                </div>
              ))}

            </div>
          </div>

          <div className="relative">

            <div className="relative overflow-hidden rounded-sm shadow-2xl">

              <img
                src="https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?w=700&h=520&fit=crop&auto=format"
                alt="Aerospace turbine engine"
                className="w-full object-cover"
                style={{ height: 400 }}
              />

              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(15,37,71,0.6) 0%, transparent 60%)",
                }}
              />

              <div className="absolute bottom-0 left-0 right-0 p-6">

                <div className="font-mono text-[10px] text-sky-300 tracking-widest mb-1">
                  LIVE ENGINE STATUS
                </div>

                <div className="font-display text-xl font-700 text-white">
                  Digital Twin Active
                </div>

                <div className="flex gap-3 mt-3">

                  {[
                    {
                      label: "CHT C1",
                      val: "168°C",
                    },
                    {
                      label: "EGT C2",
                      val: "712°C",
                    },
                    {
                      label: "OIL",
                      val: "326 kPa",
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-sm"
                    >
                      <div className="font-mono text-[9px] text-slate-300">
                        {m.label}
                      </div>

                      <div className="font-mono text-xs font-600 text-green-400">
                        {m.val}
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-white shadow-lg border border-slate-100 px-4 py-3 rounded-sm">

              <div className="font-mono text-[10px] text-slate-400 tracking-wider mb-1">
                HEALTH INDEX
              </div>

              <div className="font-display text-3xl font-700 text-green-500">
                94%
              </div>

              <div className="font-mono text-[9px] text-slate-400">
                RUL 263 flight hrs
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: "📡",
      tag: "Telemetry",
      title: "Real-Time CAN Ingestion",
      desc: "Synchronous parsing of FADEC/ECU bus traffic via CAN 2.0B / SocketCAN with microsecond timestamping. Captures RPM, CHT, EGT, oil and fuel channels at 50 Hz.",
    },
    {
      icon: "⚗️",
      tag: "Physics",
      title: "0D Thermodynamic Core",
      desc: "Mean-value physics engine computes air mass induction, combustion heat release, and expected thermal rise under real-time load — providing a rigorous baseline for residual tracking.",
    },
    {
      icon: "📊",
      tag: "Residuals",
      title: "State Residual Tracker",
      desc: "Continuous Δ = Actual − Expected computation across all channels separates genuine hardware degradation from throttle and environmental shifts.",
    },
    {
      icon: "🤖",
      tag: "AI/ML",
      title: "Multi-Fault Anomaly Detection",
      desc: "Autoencoder + Isolation Forest ensemble detects injector clogging, cooling duct restriction, and lubrication pressure drops before thresholds are breached.",
    },
    {
      icon: "🔮",
      tag: "Prognostics",
      title: "Health Index & RUL Estimation",
      desc: "Multivariable degradation fusion synthesizes a 0–100% Health Index and projects Remaining Useful Life using survival model trajectories.",
    },
    {
      icon: "🖥️",
      tag: "GCS HMI",
      title: "3D Cylinder Thermal View",
      desc: "WebGL-driven isometric cylinder bank visualization with per-cylinder color coding, live CHT/EGT overlays, and advisory banners on the GCS dashboard.",
    },
  ];

  return (
    <section
      id="features"
      className="bg-white py-24"
    >
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">

          <div className="section-tag mb-4 mx-auto inline-flex">
            MVP Deliverables
          </div>

          <h2 className="font-display font-700 text-4xl lg:text-5xl text-navy mb-4">
            Complete Digital Twin Stack
          </h2>

          <p className="text-slate-500 max-w-xl mx-auto leading-relaxed">
            Six integrated subsystems forming an indigenous,
            scalable propulsion monitoring framework — from edge
            sensor to ground station advisory.
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {features.map((f, i) => (
            <div
              key={i}
              className="card-hover border border-slate-100 bg-slate-50 p-7 flex flex-col gap-4 group"
            >

              <div className="flex items-start justify-between">

                <div className="w-12 h-12 flex items-center justify-center bg-sky-50 border border-sky-100 text-2xl rounded-sm group-hover:bg-sky-100 transition-colors">
                  {f.icon}
                </div>

                <span className="font-mono text-[9px] tracking-widest text-sky-500 bg-sky-50 px-2 py-1">
                  {f.tag}
                </span>

              </div>

              <div>

                <h3 className="font-display font-700 text-lg text-navy tracking-wide mb-2">
                  {f.title}
                </h3>

                <p className="text-sm text-slate-500 leading-relaxed">
                  {f.desc}
                </p>

              </div>

              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity">

                <span className="font-mono text-[10px] tracking-wider">
                  LEARN MORE
                </span>

                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M1 6H11M7 2L11 6L7 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>

              </div>

            </div>
          ))}

        </div>
      </div>
    </section>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Edge Sensor Ingestion",
      desc: "CAN 2.0B SocketCAN collects real-time engine bus traffic from FADEC/ECU on Raspberry Pi CM4 or NVIDIA Jetson.",
    },
    {
      n: "02",
      title: "Physics Residual Computation",
      desc: "0D thermodynamic engine calculates expected state vectors. Δ residuals flag deviations from physics baseline.",
    },
    {
      n: "03",
      title: "AI Anomaly Scoring",
      desc: "Autoencoder reconstruction error and Isolation Forest scores are fused into per-fault confidence metrics.",
    },
    {
      n: "04",
      title: "Health Index & RUL Output",
      desc: "Survival model projects RUL in flight hours. CBM action trigger dispatched to GCS operator console.",
    },
  ];

  return (
    <section className="bg-navy py-24 relative overflow-hidden">

      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle, #0ea5e9 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">

          <div
            className="section-tag mb-4 mx-auto inline-flex"
            style={{
              background: "rgba(14,165,233,0.15)",
              color: "#7dd3fc",
            }}
          >
            System Flow
          </div>

          <h2 className="font-display font-700 text-4xl text-white mb-4">
            How AeroDTwin Works
          </h2>

          <p className="text-slate-400 max-w-lg mx-auto">
            End-to-end pipeline from raw CAN bytes to actionable
            CBM intelligence — sub-second latency, zero airframe
            modification.
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {steps.map((s, i) => (
            <div
              key={i}
              className="relative flex flex-col gap-4 p-6 border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
            >

              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 -right-3 w-6 h-px bg-sky-500/40" />
              )}

              <div className="font-mono text-4xl font-700 text-sky-500/30 leading-none">
                {s.n}
              </div>

              <div>

                <h3 className="font-display font-700 text-base text-white tracking-wide mb-2">
                  {s.title}
                </h3>

                <p className="text-sm text-slate-400 leading-relaxed">
                  {s.desc}
                </p>

              </div>

            </div>
          ))}

        </div>

        <div className="mt-12 flex flex-wrap gap-2 justify-center">

          {[
            "CAN 2.0B",
            "SocketCAN",
            "SAE J1939",
            "FastAPI",
            "WebSockets",
            "TimescaleDB",
            "ONNX/TorchScript",
            "MAVLink",
            "STANAG 4586",
          ].map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] tracking-wider text-sky-300 bg-white/5 border border-white/10 px-3 py-1.5"
            >
              {t}
            </span>
          ))}

        </div>

      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const items = [
    {
      quote:
        "AeroDTwin eliminated two engine-related mission aborts in our first deployment quarter. The RUL estimator flagged a cooling duct restriction 38 flight hours before it would have caused a forced recovery.",
      name: "Wg Cdr Arjun Mehta",
      role: "ISR Squadron Commander",
      org: "Unnamed Defense Establishment",
      rating: 5,
    },
    {
      quote:
        "Transitioning from schedule-based overhauls to CBM reduced our per-engine maintenance cost by 34%. The physics residual tracker gives us confidence that no alarm is a false negative.",
      name: "Dr. Priya Subramaniam",
      role: "Propulsion Systems Engineer",
      org: "DRDO Aeronautical Division",
      rating: 5,
    },
    {
      quote:
        "The GCS HMI is exactly the right level of abstraction — 3D cylinder thermal view gives crew chiefs instant situational awareness without wading through raw telemetry streams.",
      name: "Flt Lt Rohan Bose",
      role: "UAV Ground Control Operator",
      org: "Forward Deployed GCS Unit",
      rating: 5,
    },
  ];

  return (
    <section
      id="testimonials"
      className="bg-slate-50 py-24"
    >
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">

          <div className="section-tag mb-4 mx-auto inline-flex">
            Operator Feedback
          </div>

          <h2 className="font-display font-700 text-4xl text-navy mb-4">
            Trusted by Defense Teams
          </h2>

          <p className="text-slate-500 max-w-md mx-auto">
            Mission-proven across MALE UAV squadrons, test benches,
            and forward-deployed GCS operations.
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {items.map((t, i) => (
            <div
              key={i}
              className="card-hover bg-white border border-slate-100 p-7 flex flex-col gap-5"
            >

              <div className="flex gap-0.5">

                {[...Array(t.rating)].map((_, j) => (
                  <svg
                    key={j}
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="#f59e0b"
                  >
                    <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 2 .7-4.1-3-2.9 4.2-.7L7 1z" />
                  </svg>
                ))}

              </div>

              <p className="text-sm text-slate-600 leading-relaxed flex-1 italic">
                "{t.quote}"
              </p>

              <div className="border-t border-slate-100 pt-4">

                <div className="font-display font-700 text-sm text-navy tracking-wide">
                  {t.name}
                </div>

                <div className="text-xs text-slate-500">
                  {t.role}
                </div>

                <div className="font-mono text-[10px] text-sky-500 tracking-wider mt-0.5">
                  {t.org}
                </div>

              </div>

            </div>
          ))}

        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTABanner({
  onLaunchGCS,
  onLaunchEngine,
  onLaunchEICAS,
}: {
  onLaunchGCS: () => void;
  onLaunchEngine: () => void;
  onLaunchEICAS: () => void;
}) {
  return (
    <section className="bg-white py-20">

      <div className="max-w-4xl mx-auto px-6 text-center">

        <div className="section-tag mb-6 mx-auto inline-flex">
          Get Started
        </div>

        <h2 className="font-display font-700 text-4xl lg:text-5xl text-navy mb-5 leading-tight">
          Ready to fly smarter?
          <br />
          <span className="gradient-text">
            Launch your Digital Twin.
          </span>
        </h2>

        <p className="text-slate-500 max-w-lg mx-auto mb-8 leading-relaxed">
          Deployable on COTS hardware — Raspberry Pi CM4 or NVIDIA
          Jetson — with zero airframe redesign. Operational in under
          48 hours.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">

          <button
            className="btn-primary text-sm py-3 px-8"
            onClick={onLaunchGCS}
          >
            Open GCS Dashboard

            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M1 7H13M8 2L13 7L8 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

          </button>

          <button
            className="btn-outline text-sm py-3 px-8"
            onClick={onLaunchEngine}
          >
            View 3D Engine
          </button>

          <button
            className="btn-outline text-sm py-3 px-8"
            onClick={onLaunchEICAS}
          >
            EICAS
          </button>

        </div>

        <div className="mt-12 flex flex-wrap gap-8 justify-center items-center opacity-30">

          {["DRDO", "HAL", "BEL", "ADE", "CAIR"].map((org) => (
            <span
              key={org}
              className="font-display font-700 text-xl tracking-widest text-navy"
            >
              {org}
            </span>
          ))}

        </div>

      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    {
      head: "Platform",
      links: [
        "GCS Dashboard",
        "Telemetry Ingestion",
        "Physics Engine",
        "Anomaly Detection",
        "RUL Estimator",
      ],
    },
    {
      head: "Solutions",
      links: [
        "MALE UAV ISR",
        "Test Bench Monitoring",
        "Fleet Analytics",
        "Post-Flight Replay",
        "Condition-Based Maintenance",
      ],
    },
    {
      head: "Resources",
      links: [
        "Documentation",
        "API Reference",
        "Architecture White Paper",
        "Deployment Guide",
        "Changelog",
      ],
    },
    {
      head: "Company",
      links: [
        "About AeroDTwin",
        "Research Papers",
        "Defense Partners",
        "Careers",
        "Contact",
      ],
    },
  ];

  return (
    <footer className="bg-navy text-slate-300">

      <div className="max-w-7xl mx-auto px-6 py-16">

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 mb-12">

          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 flex flex-col gap-4">

            <div className="flex items-center gap-2.5">

              <div className="w-8 h-8">

                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  className="w-full h-full"
                >
                  <polygon
                    points="16,2 30,10 30,22 16,30 2,22 2,10"
                    fill="#0ea5e9"
                    opacity="0.3"
                    stroke="#0ea5e9"
                    strokeWidth="1"
                  />

                  <circle
                    cx="16"
                    cy="16"
                    r="4"
                    fill="#0ea5e9"
                  />
                </svg>

              </div>

              <span className="font-display font-700 text-lg tracking-wider text-white">
                Aero<span className="text-sky-400">DTwin</span>
              </span>

            </div>

            <p className="text-sm text-slate-400 leading-relaxed">
              Indigenous Digital Twin framework for MALE-class UAV
              piston-engine propulsion monitoring and predictive
              maintenance.
            </p>

            <div className="flex gap-3">

              {["𝕏", "in", "gh"].map((s) => (
                <button
                  key={s}
                  className="w-8 h-8 border border-white/15 hover:border-sky-400/50 flex items-center justify-center text-xs text-slate-400 hover:text-sky-400 transition-all"
                >
                  {s}
                </button>
              ))}

            </div>
          </div>

          {/* Link Columns */}
          {cols.map((col) => (
            <div
              key={col.head}
              className="flex flex-col gap-3"
            >

              <div className="font-display font-700 text-xs tracking-[0.2em] uppercase text-white mb-1">
                {col.head}
              </div>

              {col.links.map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-xs text-slate-400 hover:text-sky-400 transition-colors leading-relaxed"
                >
                  {l}
                </a>
              ))}

            </div>
          ))}

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">

          <div className="font-mono text-[10px] text-slate-500 tracking-wider">
            © 2026 AeroDTwin Technologies. UNCLASSIFIED // FOR OFFICIAL USE ONLY.
          </div>

          <div className="flex gap-6">

            {[
              "Privacy Policy",
              "Terms of Use",
              "Export Compliance",
            ].map((l) => (
              <a
                key={l}
                href="#"
                className="font-mono text-[10px] text-slate-500 hover:text-sky-400 tracking-wider transition-colors"
              >
                {l}
              </a>
            ))}

          </div>

          <div className="font-mono text-[10px] text-slate-600 tracking-wider">
            CAN 2.0B · J1939 · MAVLink · STANAG-4586
          </div>

        </div>

      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [showGCS, setShowGCS] = useState(false);
  const [showEngine, setShowEngine] = useState(false);
  const [showEICAS, setShowEICAS] = useState(false);

  return (
    <>
      {/* ────────────────────────────────────────────────────────────────
          LANDING PAGE
      ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-full">

        <Navbar
          onLaunchGCS={() => setShowGCS(true)}
          onLaunchEngine={() => setShowEngine(true)}
          onLaunchEICAS={() => setShowEICAS(true)}
        />

        <Hero
          onLaunchGCS={() => setShowGCS(true)}
          onLaunchEngine={() => setShowEngine(true)}
          onLaunchEICAS={() => setShowEICAS(true)}
        />

        <StatsBar />

        <Solutions />

        <Features />

        <HowItWorks />

        <Testimonials />

        <CTABanner
          onLaunchGCS={() => setShowGCS(true)}
          onLaunchEngine={() => setShowEngine(true)}
          onLaunchEICAS={() => setShowEICAS(true)}
        />

        <Footer />

      </div>

      {/* ────────────────────────────────────────────────────────────────
          GCS MODAL
      ──────────────────────────────────────────────────────────────── */}
      {showGCS && (
        <div
          className="gcs-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGCS(false);
            }
          }}
        >

          <div className="w-full h-full max-w-350 max-h-225 mx-4 my-4 relative flex flex-col shadow-2xl">

            <button
              onClick={() => setShowGCS(false)}
              className="absolute top-3 right-3 z-50 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-mono text-sm transition-colors"
              aria-label="Close GCS"
            >
              ✕
            </button>

            <div className="flex-1 overflow-hidden">
              <GCSDashboard />
            </div>

          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          3D ENGINE MODAL
      ──────────────────────────────────────────────────────────────── */}
      {showEngine && (
        <div
          className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEngine(false);
            }
          }}
        >

          <div className="w-full h-full max-w-350 max-h-225 mx-4 my-4 relative flex flex-col overflow-hidden rounded-sm shadow-2xl bg-slate-950">

            {/* Close */}
            <button
              onClick={() => setShowEngine(false)}
              className="absolute top-3 right-3 z-50 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/70 border border-white/10 text-white font-mono text-sm transition-colors"
              aria-label="Close 3D engine viewer"
            >
              ✕
            </button>

            {/* Engine */}
            <div className="flex-1 overflow-hidden">
              <Engine3D />
            </div>

          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          EICAS MODAL
      ──────────────────────────────────────────────────────────────── */}
      {showEICAS && (
        <div
          className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEICAS(false);
            }
          }}
        >

          <div className="w-full h-full max-w-350 max-h-225 mx-4 my-4 relative flex flex-col overflow-hidden rounded-sm shadow-2xl bg-slate-950">

            {/* Close */}
            <button
              onClick={() => setShowEICAS(false)}
              className="absolute top-3 right-3 z-50 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/70 border border-white/10 text-white font-mono text-sm transition-colors"
              aria-label="Close EICAS viewer"
            >
              ✕
            </button>

            {/* EICAS View */}
            <div className="flex-1 overflow-hidden">
              <EICASView />
            </div>

          </div>

        </div>
      )}
    </>
  );
}