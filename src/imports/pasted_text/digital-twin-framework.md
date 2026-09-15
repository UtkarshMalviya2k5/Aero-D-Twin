Act as a Principal Aerospace Systems Architect and Senior Full-Stack Creative Technologist. Build an exhaustive, production-grade, single-file interactive prototype website (`index.html`) for an indigenous "Digital Twin Framework for MALE UAV Aero-Piston Propulsion Systems".

The deliverable must be fully coded, standalone, and completely functional with ZERO placeholders, incomplete snippets, or pseudo-code. It must be directly openable in modern web browsers using CDN imports for modern styling, charts, 3D graphics, and iconography:
- Tailwind CSS CDN
- Lucide Icons (via unpkg CDN)
- Three.js (r128 CDN)
- Chart.js (CDN)

---

### VISUAL DESIGN SYSTEM & THEME SPECS
- Aerospace Ground Control Station (GCS) C4I Tactical Cockpit Dark Mode:
  - Base Backgrounds: Deep Obsidian / Charcoal (`#07090E`, `#0B0F19`, `#111726`)
  - Subsystem Panels: Technical Slate Slate (`#172033`, `#1E293B`) with sharp 1px borders (`#23304B`, `#334155`)
  - Accent Channels: Electric Ice Cyan (`#00F0FF`), Tactical Emerald (`#10B981`) for nominal states, High-Vis Amber (`#F59E0B`) for advisory/cautions, Crimson Red (`#EF4444`) for critical alarms/abort conditions
- Typography: Technical Grotesque Sans-Serif (Inter/Rajdhani style) for UI labels; fixed-pitch Monospaced (JetBrains Mono style) for all telemetry readouts, timestamps, coordinates, sensor streams, and code terminals to eliminate numeric layout twitching.
- CRT Tactical Scanline Overlay: CSS scanline and subtle high-tech vignette across the screen for an authentic defence-grade GCS feel.

---

### COMPREHENSIVE FEATURE CHECKLIST (EVERY SUB-SYSTEM MUST BE REPRESENTED)

#### SECTION 1: GLOBAL MISSION & TELEMETRY APP HEADER
1. Vehicle Telemetry Ribbon:
   - Platform Tail ID: `MALE-UAV-TAPAS-09` (or indigenous MALE class)
   - Powerplant: `TURBOCHARGED AERO-PISTON ENGINE (4-CYLINDER HORIZONTALLY OPPOSED)`
   - Live Zulu Clock (UTC `HH:MM:SSZ` ticking live)
   - Flight Duration / Mission Elapsed Time (MET) counter
   - GPS Fix & Dynamic Altitude (e.g., `ALT: 18,500 FT | LAT: 24.5854° N | LON: 73.7125° E`)
2. Hardware Ingestion & Interface States:
   - SocketCAN / CAN-Bus 2.0B status pill: `CAN0: 100 Hz SYNCHRONIZED` (pulsing green indicator)
   - Dual-Redundant FADEC Channel Status: `CH-A: ACTIVE | CH-B: HOT-STANDBY`
   - Datalink Telemetry Latency: Real-time numeric ping (e.g., `21 ms`)
3. Control Mode Switcher:
   - Three operational modes: `[LIVE TELEMETRY STREAM]`, `[MISSION REPLAY ENGINE]`, `[WHAT-IF SIMULATOR]`
4. Primary Interactive Demo Actions:
   - `[INJECT FAULT]` Button (Glowing red outline to trigger multi-parameter cascading engine failure demo)
   - `[EXPORT TELEMETRY]` Button (Downloads genuine live telemetry dataset as CSV)

#### SECTION 2: TOP CORE KPI COCKPIT STRIP (6 DYNAMIC METRIC TILES)
Include 6 distinct metric cards complete with label, value, engineering unit, and miniature status track bars:
1. Crankshaft RPM: Real-time speed (nominal ~5,240 RPM; redline: 5,800 RPM).
2. Average CHT: Cylinder Head Temperature across all cylinders in °C (nominal: 175°C; warning: >200°C; critical: >225°C).
3. Peak EGT: Exhaust Gas Temperature in °C (nominal: 780°C; peak envelope: 850°C).
4. Lubrication Subsystem: Combined Dual Readout — Oil Pressure (bar/psi, nominal ~4.8 bar) and Oil Temperature (°C, nominal ~92°C).
5. Fuel Flow & Delivery: Mass flow rate in Liters/Hour (L/hr) + Manifold Absolute Pressure (MAP in inHg).
6. Composite Engine Health Index (EHI): Dynamic aggregate score (0 to 100%) with status badge (`OPTIMAL`, `CAUTION`, or `CRITICAL OVERHEAT`).

#### SECTION 3: THREE-COLUMN MISSION MONITORING WORKSPACE

##### COLUMN A (LEFT): HARDWARE TELEMETRY & MULTI-CYLINDER MATRIX
1. 4-Cylinder Thermal Balance Matrix:
   - Distinct comparative horizontal or vertical stacked bars for Cylinder 1, Cylinder 2, Cylinder 3, and Cylinder 4.
   - Dual metrics per cylinder: CHT (green/amber/red) and EGT (cyan/amber/red).
   - Real-time Exhaust Balance Delta ($\Delta$EGT) calculation to instantly expose unbalance or lean mixture conditions.
2. Lubrication & Fuel Flow Subsystem Breakdown:
   - Oil Pump delivery status, filter differential pressure ($\Delta P$), and oil sump temperature.
   - Fuel Rail Pressure, Injection Timing advance (degrees Before Top Dead Center - °BTDC), and injector pulse-width duration ($\mu s$).
3. High-Frequency Vibration Spectrum Analyzer (FFT):
   - Interactive Chart.js bar visualizer representing frequency bins:
     - 1X Engine Shaft rotational frequency (87 Hz fundamental)
     - 2X Harmonic resonance
     - Propeller Blade-Pass Frequency (BPF)
     - High-frequency bearing broadband noise
   - Overall Vibration Energy: RMS readout in Gs (nominal ~1.3g).
4. Electrical & Battery/Alternator Health:
   - Primary 28 VDC avionics bus voltage, starter/alternator load (Amps), and backup battery state-of-charge (%).

##### COLUMN B (CENTER): 3D DIGITAL TWIN & REAL-TIME SIMULATION CANVAS
1. Smooth Interactive WebGL / Three.js 3D Virtual Engine:
   - Custom procedural 3D model:
     - Central crankcase & engine block
     - 4 horizontally-opposed cylinder assemblies with cooling fins
     - Forward rotating propeller driveshaft & hub
     - Turbocharger turbine & exhaust manifold plumbing
   - Orbit controls / continuous smooth kinematic rotation with live Crankshaft Angle (° deg) display.
   - Dynamic Thermal Heatmap Shaders: Visual engine components change color based on ingested telemetry (e.g., green/slate during normal runs, shifting to glowing pulsing crimson under overheating or lean misfire conditions).
   - Quick View Controls: `[RESET CAMERA]`, `[WIREFRAME VIEW]`, and `[EXPLODED VIEW TOGGLE]`.
2. Rolling Telemetry Line Stream:
   - Multi-axis Chart.js line plot displaying a rolling 10-second window of Crankshaft RPM and CHT values, dynamically rendering micro-variations and jitter.
3. Simulation & Mission Replay Scrubbing Controls:
   - Mission Replay scrubber timeline with indexed flight phases: `[ENGINE START] -> [TAKEOFF / FULL SPOOL] -> [MAX CLIMB] -> [LOITER ISR CRUISE] -> [DESCENT / APPROACH]`.
   - "What-If" Environmental Condition Ingestion Sliders:
     - Density Altitude slider ($0$ to $32,000\text{ ft}$)
     - Ambient Outside Air Temperature / Hot-Soak slider ($-40^\circ\text{C}$ to $+55^\circ\text{C}$)
     - Rapid Throttle Transient / Step-Transition slider ($30\%$ to $100\%$ WOT)

##### COLUMN C (RIGHT): AI/ML PREDICTIVE DIAGNOSTICS & MAINTENANCE LAYER
1. Transition from Reactive to Intelligent Anomaly Matrix:
   - 6 Live Monitored Failure Modes with status indicators:
     - Cylinder Misfire Condition (`CLEAR` / `DETECTED`)
     - Fuel Injector Drift / Spray Abnormality (`NOMINAL` / `DRIFT`)
     - Cooling System Thermal Degradation (`OPTIMAL` / `OVERHEAT`)
     - Lubrication Breakdown & Viscosity Loss (`NOMINAL` / `SHEAR`)
     - Sensor Drift & Telemetry Inconsistency (`<0.2% TOL` / `FAULT`)
     - Combustion Instability & Knock Jitter (`STABLE` / `UNSTABLE`)
2. Remaining Useful Life (RUL) Trajectory Curve:
   - Multi-curve Chart.js graph plotting Engine Operating Flight Hours ($X$-axis) against Structural Health Margin / Degradation ($Y$-axis).
   - Visual comparison: Historical degradation curve vs. Physics-Informed AI Predicted Degradation path toward the 500-hour Time Between Overhaul (TBO).
   - Remaining useful life readout in hours with confidence bound (e.g., `312.4 HRS ± 5.2h`).
3. Autonomous Maintenance Advisory Terminal (Explainable AI / XAI):
   - Mission log terminal with timestamped events, component level diagnostics, and clear corrective action recommendations (e.g., *"[WARN-03] Cyl-3 CHT delta > 15°C over baseline. Root Cause: Partial fuel injector orifice blockage. Advisory: Borescope exhaust valve & check fuel injector flow rate before next sortie."*).

#### SECTION 4: SYSTEM ARCHITECTURE & INNOVATION MODAL
Include an expandable or tabbed architectural summary panel explaining the 4 core pillars of the indigenous system:
1. CAN-Bus / SocketCAN Edge Ingestion Layer
2. Thermodynamic Hybrid Physics + Physics-Informed Neural Network (PINN) Model
3. Edge AI / Autoencoder Anomaly Detection Pipeline
4. Fleet-wide Long-Term Health & Predictive Maintenance Cloud Synchronization

#### SECTION 5: FOOTER SPECIFICATIONS & LOGGING
- Ingestion telemetry metrics (SocketCAN baud rate 500 kbps, lossless packet buffer status, extended Kalman filter synchronization status).
- Tactical action buttons: `[DOWNLOAD COMPLETE MISSION LOG (.CSV)]` and `[CLEAR LOGS]`.

---

### FUNCTIONAL JAVASCRIPT LOGIC & DEMO INTERACTION ENGINE
1. Live Telemetry Daemon:
   - `setInterval` based loop simulating natural high-frequency CAN-Bus telemetry with micro-jitter (realistic RPM fluctuations between 5,235 and 5,248 RPM, CHT thermal diffusion, vibration harmonic drift).
2. Interactive Cascading Fault Injection Demonstration:
   - When the user clicks the `[INJECT FAULT]` button:
     - 3D Engine Model reacts immediately: Cylinder 3 mesh turns bright glowing crimson red (`#EF4444`).
     - Cylinder 3 CHT surges to 228°C; EGT spikes past 845°C.
     - Engine Health Index (EHI) drops from 96.4% to degraded 71.8% (`CRITICAL OVERHEAT`).
     - AI Anomaly Matrix flags: Cooling system turns red (`CRITICAL OVERHEAT`), Injector status turns amber (`LEAN DELTA DETECTED`).
     - RUL trajectory curve steepens downwards, cutting projected remaining hours down from 312 hrs to 84 hrs.
     - Autonomous Advisory Terminal prepends an urgent tactical maintenance advisory with immediate corrective guidance.
     - Audio/visual tactical cue: Subtle screen alert glow and red UI badges.
   - When clicked again (`[CLEAR FAULT]`): Smoothly interpolates all 3D materials, telemetry values, charts, and status cards back to nominal green states.
3. Functional CSV Mission Exporter:
   - Generates and triggers an actual browser file download of `UAV_MALE_DIGITAL_TWIN_TELEMETRY.csv` containing generated timestamps, RPM, CHTs, EGTs, and Health Index logs.
4. Clean Canvas Resizing:
   - Three.js camera aspect ratio and renderer dynamically update on window resize.