import React, { useState, useEffect } from "react";

// ── Math Helpers for SVG Arc Gauges ──────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  x: number,
  y: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(x, y, r, startAngle);
  const end = polarToCartesian(x, y, r, endAngle);
  const diff = endAngle - startAngle;
  const largeArcFlag = Math.abs(diff) <= 180 ? "0" : "1";
  const sweepFlag = diff > 0 ? "1" : "0";

  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

// ── Segment Arc with Needle or Pie Fill ──────────────────────────────────────
function DialGauge({
  value,
  min,
  max,
  startAngle,
  endAngle,
  radius = 42,
  size = 100,
  amberZone,
  redZone,
  showPie = true,
  ticks = [],
  readoutBox,
  decimals = 0,
}: {
  value: number;
  min: number;
  max: number;
  startAngle: number;
  endAngle: number;
  radius?: number;
  size?: number;
  amberZone?: [number, number];
  redZone?: [number, number];
  showPie?: boolean;
  ticks?: { val: number; label?: string }[];
  readoutBox?: { x: number; y: number; width: number; height: number };
  decimals?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const clampedVal = Math.min(Math.max(value, min), max);
  const ratio = (clampedVal - min) / (max - min);
  const currentAngle = startAngle + ratio * (endAngle - startAngle);

  // Pie slice path
  const pieStart = polarToCartesian(cx, cy, radius - 2, startAngle);
  const pieEnd = polarToCartesian(cx, cy, radius - 2, currentAngle);
  const pieDiff = currentAngle - startAngle;
  const pieLarge = Math.abs(pieDiff) <= 180 ? "0" : "1";
  const pieSweep = pieDiff > 0 ? "1" : "0";
  const piePath = `M ${cx} ${cy} L ${pieStart.x} ${pieStart.y} A ${
    radius - 2
  } ${radius - 2} 0 ${pieLarge} ${pieSweep} ${pieEnd.x} ${pieEnd.y} Z`;

  // Needle path
  const needleTip = polarToCartesian(cx, cy, radius + 2, currentAngle);
  const needleBase = polarToCartesian(cx, cy, 6, currentAngle + 180);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Arc */}
        <path
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Amber Limit Arc */}
        {amberZone && (
          <path
            d={describeArc(
              cx,
              cy,
              radius + 2,
              startAngle + ((amberZone[0] - min) / (max - min)) * (endAngle - startAngle),
              startAngle + ((amberZone[1] - min) / (max - min)) * (endAngle - startAngle)
            )}
            fill="none"
            stroke="#facc15"
            strokeWidth="3.5"
          />
        )}

        {/* Red Limit Arc */}
        {redZone && (
          <path
            d={describeArc(
              cx,
              cy,
              radius + 2,
              startAngle + ((redZone[0] - min) / (max - min)) * (endAngle - startAngle),
              startAngle + ((redZone[1] - min) / (max - min)) * (endAngle - startAngle)
            )}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3.5"
          />
        )}

        {/* Dynamic Blue Pie Wedge */}
        {showPie && (
          <path
            d={piePath}
            fill="#3b4d6b"
            opacity="0.85"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        )}

        {/* Ticks and Markings */}
        {ticks.map((t, idx) => {
          const tRatio = (t.val - min) / (max - min);
          const tAngle = startAngle + tRatio * (endAngle - startAngle);
          const pInner = polarToCartesian(cx, cy, radius - 4, tAngle);
          const pOuter = polarToCartesian(cx, cy, radius + 3, tAngle);
          const pText = polarToCartesian(cx, cy, radius - 14, tAngle);

          return (
            <g key={idx}>
              <line
                x1={pInner.x}
                y1={pInner.y}
                x2={pOuter.x}
                y2={pOuter.y}
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              {t.label !== undefined && (
                <text
                  x={pText.x}
                  y={pText.y + 3.5}
                  fill="#ffffff"
                  fontSize="9.5"
                  fontFamily="'Consolas', 'Courier New', monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {t.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Pointer Needle (for non-pie dials) */}
        {!showPie && (
          <line
            x1={needleBase.x}
            y1={needleBase.y}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Cockpit Value Readout Box */}
      {readoutBox && (
        <div
          className="absolute border-2 border-white bg-black px-1.5 py-0.5 flex items-center justify-center pointer-events-none"
          style={{
            top: `${readoutBox.y}px`,
            left: `${readoutBox.x}px`,
            minWidth: `${readoutBox.width}px`,
            height: `${readoutBox.height}px`,
          }}
        >
          <span className="font-mono text-sm font-bold text-white tracking-wider leading-none">
            {value.toFixed(decimals)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Fuel Tank Gauge ─────────────────────────────────────────────────────────
function TankDial({
  label,
  value,
  subLabel,
  color = "#ffffff",
}: {
  label: string;
  value: number;
  subLabel?: string;
  color?: string;
}) {
  const size = 96;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 36;
  const ticks = Array.from({ length: 9 }, (_, i) => -150 + i * 37.5);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <path
            d={describeArc(cx, cy, radius, -150, 150)}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
          />
          {ticks.map((deg, i) => {
            const p1 = polarToCartesian(cx, cy, radius, deg);
            const p2 = polarToCartesian(cx, cy, radius + 5, deg);
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth="2"
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="font-mono text-[10px] font-bold tracking-widest leading-none mb-1"
            style={{ color }}
          >
            {label}
          </span>
          <span
            className="font-mono text-xs font-bold tracking-wider leading-none"
            style={{ color }}
          >
            {value}
          </span>
          {subLabel && (
            <span
              className="font-mono text-[9px] font-bold tracking-widest mt-1 leading-none"
              style={{ color }}
            >
              {subLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main EICAS View Component ────────────────────────────────────────────────
export default function EICASView() {
  const [telemetry, setTelemetry] = useState({
    n1: [64.4, 68.9],
    egt: [629, 646],
    n2: [74.0, 75.9],
    ff: [1.64, 2.07],
    oilP: [54, 52],
    oilT: [96, 98],
    oilQ: [100, 100],
    vib: [1.3, 1.4],
    hydP: [3.0, 3.1],
    hydQ: [98, 99],
    fuelLeft: 2386,
    fuelCtr: 11536,
    fuelImbal: 1510,
    tat: 19,
  });

  // Cockpit telemetry slight jitter
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        n1: [
          +(64.4 + (Math.random() - 0.5) * 0.4).toFixed(1),
          +(68.9 + (Math.random() - 0.5) * 0.4).toFixed(1),
        ],
        egt: [
          Math.round(629 + (Math.random() - 0.5) * 4),
          Math.round(646 + (Math.random() - 0.5) * 4),
        ],
        n2: [
          +(74.0 + (Math.random() - 0.5) * 0.3).toFixed(1),
          +(75.9 + (Math.random() - 0.5) * 0.3).toFixed(1),
        ],
        ff: [
          +(1.64 + (Math.random() - 0.5) * 0.04).toFixed(2),
          +(2.07 + (Math.random() - 0.5) * 0.04).toFixed(2),
        ],
      }));
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full bg-black text-white p-5 flex justify-center items-center select-none overflow-auto font-mono">
      <div
        className="w-145 bg-black border border-slate-900 flex flex-col p-4 shadow-2xl relative"
        style={{ minHeight: "680px" }}
      >
        {/* Top Header */}
        <div className="flex justify-between items-center px-12 mb-2">
          <span className="text-emerald-500 font-bold text-sm tracking-widest">
            TO
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider">
            <span className="text-cyan-400">TAT</span>
            <span className="text-white">+{telemetry.tat} c</span>
          </div>
        </div>

        {/* Main Grid: Left Engine Stack & Right System Columns */}
        <div className="grid grid-cols-12 gap-2 flex-1 relative">
          {/* Vertical Separator Line */}
          <div className="absolute top-0 bottom-0 left-[54%] w-0.5 bg-cyan-500" />

          {/* ── Left Column: Primary Engine Dials (ENG 1 & 2) ── */}
          <div className="col-span-6 pr-2 flex flex-col justify-between">
            {/* N1 Section */}
            <div className="flex flex-col items-center">
              <div className="flex justify-between w-full">
                <DialGauge
                  value={telemetry.n1[0]}
                  min={0}
                  max={110}
                  startAngle={0}
                  endAngle={230}
                  redZone={[98, 110]}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 20, label: "2" },
                    { val: 40, label: "4" },
                    { val: 60, label: "6" },
                    { val: 80, label: "8" },
                    { val: 100, label: "10" },
                  ]}
                  readoutBox={{ x: 42, y: 4, width: 44, height: 20 }}
                  decimals={1}
                />
                <DialGauge
                  value={telemetry.n1[1]}
                  min={0}
                  max={110}
                  startAngle={0}
                  endAngle={230}
                  redZone={[98, 110]}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 20, label: "2" },
                    { val: 40, label: "4" },
                    { val: 60, label: "6" },
                    { val: 80, label: "8" },
                    { val: 100, label: "10" },
                  ]}
                  readoutBox={{ x: 42, y: 4, width: 44, height: 20 }}
                  decimals={1}
                />
              </div>
              <span className="text-cyan-400 font-bold text-xs -mt-1 tracking-widest">
                N1
              </span>
            </div>

            {/* EGT Section */}
            <div className="flex flex-col items-center mt-1">
              <div className="flex justify-between w-full">
                <DialGauge
                  value={telemetry.egt[0]}
                  min={200}
                  max={950}
                  startAngle={0}
                  endAngle={210}
                  amberZone={[870, 910]}
                  redZone={[910, 950]}
                  ticks={[{ val: 200 }, { val: 600 }, { val: 900 }]}
                  readoutBox={{ x: 42, y: 6, width: 44, height: 20 }}
                />
                <DialGauge
                  value={telemetry.egt[1]}
                  min={200}
                  max={950}
                  startAngle={0}
                  endAngle={210}
                  amberZone={[870, 910]}
                  redZone={[910, 950]}
                  ticks={[{ val: 200 }, { val: 600 }, { val: 900 }]}
                  readoutBox={{ x: 42, y: 6, width: 44, height: 20 }}
                />
              </div>
              <span className="text-cyan-400 font-bold text-xs -mt-1 tracking-widest">
                EGT
              </span>
            </div>

            {/* N2 Section */}
            <div className="flex flex-col items-center mt-1">
              <div className="flex justify-between w-full">
                <DialGauge
                  value={telemetry.n2[0]}
                  min={0}
                  max={100}
                  startAngle={0}
                  endAngle={210}
                  amberZone={[88, 94]}
                  redZone={[94, 100]}
                  readoutBox={{ x: 42, y: 6, width: 46, height: 20 }}
                  decimals={1}
                />
                <DialGauge
                  value={telemetry.n2[1]}
                  min={0}
                  max={100}
                  startAngle={0}
                  endAngle={210}
                  amberZone={[88, 94]}
                  redZone={[94, 100]}
                  readoutBox={{ x: 42, y: 6, width: 46, height: 20 }}
                  decimals={1}
                />
              </div>
              <span className="text-cyan-400 font-bold text-xs -mt-1 tracking-widest">
                N2
              </span>
            </div>

            {/* Fuel Flow (FF / FU) Section */}
            <div className="flex flex-col items-center mt-1">
              <div className="flex justify-between w-full">
                <DialGauge
                  value={telemetry.ff[0]}
                  min={0}
                  max={8}
                  startAngle={0}
                  endAngle={220}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 2, label: "2" },
                    { val: 4, label: "4" },
                    { val: 6, label: "6" },
                  ]}
                  readoutBox={{ x: 42, y: 6, width: 44, height: 20 }}
                  decimals={2}
                />
                <DialGauge
                  value={telemetry.ff[1]}
                  min={0}
                  max={8}
                  startAngle={0}
                  endAngle={220}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 2, label: "2" },
                    { val: 4, label: "4" },
                    { val: 6, label: "6" },
                  ]}
                  readoutBox={{ x: 42, y: 6, width: 44, height: 20 }}
                  decimals={2}
                />
              </div>
              <div className="flex flex-col items-center -mt-1">
                <span className="text-cyan-400 font-bold text-[11px] tracking-wider">
                  FF/FU
                </span>
                <span className="text-cyan-400 font-bold text-[9px] tracking-widest">
                  KG x 1000
                </span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Secondary Instruments ── */}
          <div className="col-span-6 pl-4 flex flex-col justify-between">
            {/* OIL P Section */}
            <div className="flex flex-col items-center">
              <div className="flex justify-between w-full">
                <DialGauge
                  value={telemetry.oilP[0]}
                  min={0}
                  max={120}
                  startAngle={0}
                  endAngle={220}
                  size={86}
                  radius={34}
                  showPie={false}
                  amberZone={[15, 30]}
                  redZone={[0, 15]}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 50, label: "50" },
                    { val: 100, label: "100" },
                  ]}
                />
                <DialGauge
                  value={telemetry.oilP[1]}
                  min={0}
                  max={120}
                  startAngle={0}
                  endAngle={220}
                  size={86}
                  radius={34}
                  showPie={false}
                  amberZone={[15, 30]}
                  redZone={[0, 15]}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 50, label: "50" },
                    { val: 100, label: "100" },
                  ]}
                />
              </div>
              <span className="text-cyan-400 font-bold text-xs -mt-1 tracking-widest">
                OIL P
              </span>
            </div>

            {/* OIL T Section */}
            <div className="flex flex-col items-center mt-1">
              <div className="flex justify-between w-full">
                <DialGauge
                  value={telemetry.oilT[0]}
                  min={0}
                  max={240}
                  startAngle={0}
                  endAngle={220}
                  size={86}
                  radius={34}
                  showPie={false}
                  amberZone={[135, 155]}
                  redZone={[155, 240]}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 100, label: "100" },
                    { val: 200, label: "200" },
                  ]}
                />
                <DialGauge
                  value={telemetry.oilT[1]}
                  min={0}
                  max={240}
                  startAngle={0}
                  endAngle={220}
                  size={86}
                  radius={34}
                  showPie={false}
                  amberZone={[135, 155]}
                  redZone={[155, 240]}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 100, label: "100" },
                    { val: 200, label: "200" },
                  ]}
                />
              </div>
              <span className="text-cyan-400 font-bold text-xs -mt-1 tracking-widest">
                OIL T
              </span>
            </div>

            {/* OIL Q % Readout Row */}
            <div className="flex justify-between items-center px-2 my-1">
              <div className="border border-white bg-black px-2 py-0.5">
                <span className="text-xs font-bold text-white">
                  {telemetry.oilQ[0]}
                </span>
              </div>
              <span className="text-cyan-400 font-bold text-[11px] tracking-wider">
                OIL Q %
              </span>
              <div className="border border-white bg-black px-2 py-0.5">
                <span className="text-xs font-bold text-white">
                  {telemetry.oilQ[1]}
                </span>
              </div>
            </div>

            {/* VIBRATION Section */}
            <div className="flex flex-col items-center">
              <div className="flex justify-between w-full">
                <DialGauge
                  value={telemetry.vib[0]}
                  min={0}
                  max={5}
                  startAngle={0}
                  endAngle={220}
                  size={86}
                  radius={34}
                  ticks={[
                    { val: 1, label: "1" },
                    { val: 3, label: "3" },
                    { val: 4, label: "4" },
                    { val: 5, label: "5" },
                  ]}
                />
                <DialGauge
                  value={telemetry.vib[1]}
                  min={0}
                  max={5}
                  startAngle={0}
                  endAngle={220}
                  size={86}
                  radius={34}
                  ticks={[
                    { val: 1, label: "1" },
                    { val: 3, label: "3" },
                    { val: 4, label: "4" },
                    { val: 5, label: "5" },
                  ]}
                />
              </div>
              <span className="text-cyan-400 font-bold text-xs -mt-1 tracking-widest">
                VIB
              </span>
            </div>

            {/* Horizontal Sub-Separator */}
            <div className="w-full h-0.5 bg-cyan-500 my-2" />

            {/* HYD P Section */}
            <div className="flex flex-col items-center">
              <div className="flex justify-between w-full">
                <DialGauge
                  value={telemetry.hydP[0]}
                  min={0}
                  max={5}
                  startAngle={0}
                  endAngle={240}
                  size={90}
                  radius={35}
                  showPie={false}
                  amberZone={[1.5, 2.5]}
                  redZone={[0, 1.5]}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 1, label: "1" },
                    { val: 2, label: "2" },
                    { val: 3, label: "3" },
                    { val: 4, label: "4" },
                  ]}
                />
                <DialGauge
                  value={telemetry.hydP[1]}
                  min={0}
                  max={5}
                  startAngle={0}
                  endAngle={240}
                  size={90}
                  radius={35}
                  showPie={false}
                  amberZone={[1.5, 2.5]}
                  redZone={[0, 1.5]}
                  ticks={[
                    { val: 0, label: "0" },
                    { val: 1, label: "1" },
                    { val: 2, label: "2" },
                    { val: 3, label: "3" },
                    { val: 4, label: "4" },
                  ]}
                />
              </div>
              <div className="flex justify-between w-full px-6 -mt-3 text-[11px] font-bold text-cyan-400">
                <span>A</span>
                <span className="tracking-widest">HYD P</span>
                <span>B</span>
              </div>
            </div>

            {/* HYD Q % Readout Row */}
            <div className="flex justify-between items-center px-2 mt-1 mb-1">
              <div className="border border-white bg-black px-2 py-0.5">
                <span className="text-xs font-bold text-white">
                  {telemetry.hydQ[0]}
                </span>
              </div>
              <span className="text-cyan-400 font-bold text-[11px] tracking-wider">
                HYD Q %
              </span>
              <div className="border border-white bg-black px-2 py-0.5">
                <span className="text-xs font-bold text-white">
                  {telemetry.hydQ[1]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Section: Fuel Tanks ── */}
        <div className="mt-3 pt-2 border-t-2 border-cyan-500 w-[54%]">
          <div className="flex justify-between items-center pr-2">
            <TankDial label="1" value={telemetry.fuelLeft} color="#ffffff" />
            <TankDial label="CTR" value={telemetry.fuelCtr} color="#ffffff" />
            <TankDial
              label="2"
              value={telemetry.fuelImbal}
              subLabel="IMBAL"
              color="#f59e0b"
            />
          </div>
          <div className="text-center mt-1">
            <span className="text-cyan-400 font-bold text-[11px] tracking-widest">
              FUEL KG
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}