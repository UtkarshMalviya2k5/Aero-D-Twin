import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_3D_PATH = "/models/AeroDTwin_Rotax_20_Compounds.gltf";

type ComponentInfo = {
  id: string;
  name: string;
  health: number;
  status: "NORMAL" | "WARNING" | "CRITICAL";
  temperature: number;
  vibration: number;
  pressure: number;
};

const healthData: ComponentInfo[] = [
  { id: "01", name: "Engine Assembly", health: 96, status: "NORMAL", temperature: 82, vibration: 1.7, pressure: 4.8 },
  { id: "02", name: "Cylinder Group 01", health: 94, status: "NORMAL", temperature: 176, vibration: 2.1, pressure: 5.7 },
  { id: "03", name: "Cylinder Group 02", health: 91, status: "NORMAL", temperature: 181, vibration: 2.4, pressure: 5.6 },
  { id: "04", name: "Cylinder Group 03", health: 78, status: "WARNING", temperature: 205, vibration: 3.2, pressure: 5.3 },
  { id: "05", name: "Cylinder Group 04", health: 97, status: "NORMAL", temperature: 174, vibration: 1.9, pressure: 5.8 },
  { id: "06", name: "Crankcase - Left", health: 98, status: "NORMAL", temperature: 91, vibration: 1.4, pressure: 4.9 },
  { id: "07", name: "Crankcase - Right", health: 95, status: "NORMAL", temperature: 93, vibration: 1.6, pressure: 4.8 },
  { id: "08", name: "Reduction Gearbox", health: 89, status: "WARNING", temperature: 108, vibration: 2.8, pressure: 6.1 },
  { id: "09", name: "Oil System", health: 93, status: "NORMAL", temperature: 92, vibration: 1.8, pressure: 4.7 },
  { id: "10", name: "Oil Filter", health: 99, status: "NORMAL", temperature: 87, vibration: 1.2, pressure: 4.6 },
  { id: "11", name: "Magneto System", health: 97, status: "NORMAL", temperature: 76, vibration: 1.3, pressure: 0 },
  { id: "12", name: "Exhaust Elbow", health: 86, status: "WARNING", temperature: 612, vibration: 2.7, pressure: 1.2 },
  { id: "13", name: "Exhaust Collector", health: 92, status: "NORMAL", temperature: 584, vibration: 2.2, pressure: 1.3 },
  { id: "14", name: "Intake Manifold", health: 96, status: "NORMAL", temperature: 48, vibration: 1.1, pressure: 1.32 },
  { id: "15", name: "Turbo / Turbine", health: 83, status: "WARNING", temperature: 691, vibration: 3.4, pressure: 1.46 },
  { id: "16", name: "Starter", health: 99, status: "NORMAL", temperature: 61, vibration: 0.8, pressure: 0 },
  { id: "17", name: "Cooling Port 01", health: 98, status: "NORMAL", temperature: 79, vibration: 1.1, pressure: 2.8 },
  { id: "18", name: "Cooling Port 02", health: 97, status: "NORMAL", temperature: 81, vibration: 1.2, pressure: 2.7 },
  { id: "19", name: "Sensor Assembly", health: 95, status: "NORMAL", temperature: 83, vibration: 1.5, pressure: 4.7 },
  { id: "20", name: "Auxiliary Assembly", health: 90, status: "NORMAL", temperature: 88, vibration: 1.9, pressure: 3.1 },
];

function statusColor(status: ComponentInfo["status"]) {
  if (status === "CRITICAL") return "#c44b4b";
  if (status === "WARNING") return "#c89b3c";
  return "#a8b08a";
}

function EngineModel({
  selected,
  hovered,
  onSelect,
  onHover,
  controlsRef,
}: {
  selected: string | null;
  hovered: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  controlsRef: React.RefObject<any>;
}) {
  const { scene } = useGLTF(MODEL_3D_PATH);
  const modelRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const meshes = useMemo(() => {
    const result: THREE.Mesh[] = [];
    scene.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) result.push(obj as THREE.Mesh);
    });
    return result;
  }, [scene]);

  // Prepare every mesh for independent highlighting and divide the model
  // into 20 interactive component buckets.
  useEffect(() => {
    meshes.forEach((mesh, index) => {
      const componentId = String((index % 20) + 1).padStart(2, "0");
      mesh.userData.componentId = componentId;

      // Clone materials so highlighting one component cannot recolor
      // another component that happens to share the same GLTF material.
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material: THREE.Material) => {
          const cloned = material.clone() as THREE.MeshStandardMaterial;
          cloned.userData.originalColor = cloned.color
            ? cloned.color.clone()
            : new THREE.Color("#8a93a3");
          cloned.userData.originalEmissive = cloned.emissive
            ? cloned.emissive.clone()
            : new THREE.Color("#000000");
          cloned.userData.originalEmissiveIntensity =
            cloned.emissiveIntensity ?? 0;
          return cloned;
        });
      } else if (mesh.material) {
        const cloned = mesh.material.clone() as THREE.MeshStandardMaterial;
        cloned.userData.originalColor = cloned.color
          ? cloned.color.clone()
          : new THREE.Color("#8a93a3");
        cloned.userData.originalEmissive = cloned.emissive
          ? cloned.emissive.clone()
          : new THREE.Color("#000000");
        cloned.userData.originalEmissiveIntensity =
          cloned.emissiveIntensity ?? 0;
        mesh.material = cloned;
      }
    });
  }, [meshes]);

  // Automatically center and scale the engine so it fills the viewer.
  useEffect(() => {
    if (!modelRef.current) return;

    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    if (!isFinite(maxDimension) || maxDimension <= 0) return;

    const targetSize = 5.2;
    const scale = targetSize / maxDimension;

    scene.position.sub(center);
    scene.scale.setScalar(scale);

    requestAnimationFrame(() => {
      controlsRef.current?.target.set(0, 0, 0);
      controlsRef.current?.update();
    });
  }, [scene, controlsRef]);

  useFrame(() => {
    meshes.forEach((mesh) => {
      const id = mesh.userData.componentId;
      const isSelected = selected === id;
      const isHovered = hovered === id;

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      materials.forEach((material: any) => {
        if (!material.color) return;

        const originalColor =
          material.userData.originalColor || new THREE.Color("#8a93a3");
        const originalEmissive =
          material.userData.originalEmissive || new THREE.Color("#000000");

        if (isSelected) {
          material.color.set("#d8c77a");
          if (material.emissive) material.emissive.set("#8d7b32");
          material.emissiveIntensity = 0.22;
          material.metalness = Math.max(material.metalness ?? 0, 0.35);
        } else if (isHovered) {
          material.color.set("#f0eee5");
          if (material.emissive) material.emissive.set("#8f8a72");
          material.emissiveIntensity = 0.10;
        } else {
          material.color.copy(originalColor);
          if (material.emissive) material.emissive.copy(originalEmissive);
          material.emissiveIntensity =
            material.userData.originalEmissiveIntensity ?? 0;
        }
      });
    });
  });

  const focusObject = (object: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(size.length() * 2.2, 1.8);

    camera.position.set(
      center.x + distance,
      center.y + distance * 0.65,
      center.z + distance
    );

    controlsRef.current?.target.copy(center);
    controlsRef.current?.update();
  };

  return (
    <group
      ref={modelRef}
      onPointerMissed={() => onSelect(null)}
      onClick={(e: any) => {
        e.stopPropagation();
        const id = e.object?.userData?.componentId;
        if (id) onSelect(id);
      }}
      onDoubleClick={(e: any) => {
        e.stopPropagation();
        const id = e.object?.userData?.componentId;
        if (id) {
          onSelect(id);
          focusObject(e.object);
        }
      }}
    >
      <primitive
        object={scene}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          const id = e.object?.userData?.componentId;
          if (id) onHover(id || null);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "default";
        }}
      />
    </group>
  );
}

export default function Engine3D() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [visible, setVisible] = useState(true);
  const controlsRef = useRef<any>(null);

  const selectedInfo =
    healthData.find((item) => item.id === selected) || null;

  const filtered = healthData.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const resetView = () => {
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.object.position.set(5.5, 3.6, 5.5);
    controlsRef.current?.update();
    setSelected(null);
    setHovered(null);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setHovered(null);
      }
      if (e.key.toLowerCase() === "r") resetView();
    };

    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 45%, #20231f 0%, #111310 55%, #090a09 100%)",
        color: "#e8e6dc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <Canvas
        camera={{ position: [5.5, 3.6, 5.5], fov: 42, near: 0.01, far: 1000 }}
        dpr={1}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={2.1} />
        <directionalLight position={[6, 8, 6]} intensity={2.4} />
        <directionalLight position={[-6, 4, -5]} intensity={1.4} />
        <pointLight position={[0, 2, 3]} intensity={0.65} color="#b7b29b" />

        <gridHelper
          args={[14, 28, "#3b3d36", "#242620"]}
          position={[0, -3.0, 0]}
        />

        <Suspense fallback={null}>
          {visible && (
            <EngineModel
              selected={selected}
              hovered={hovered}
              onSelect={setSelected}
              onHover={setHovered}
              controlsRef={controlsRef}
            />
          )}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.5}
          maxDistance={15}
          enablePan
        />
      </Canvas>

      {/* Top HUD */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: "rgba(13, 15, 13, 0.9)",
          borderBottom: "1px solid rgba(201,180,88,0.18)",
          backdropFilter: "blur(3px)",
          pointerEvents: "none",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1.2 }}>
            AERODTWIN <span style={{ color: "#c9b458" }}>// ENGINE DIGITAL TWIN</span>
          </div>
          <div style={{ fontSize: 10, opacity: 0.55, marginTop: 3 }}>
            ROTAX 914 PROPULSION SYSTEM • ENGINEERING INSPECTION VIEW
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>20 COMPONENT REGISTER</div>
          <div style={{ fontSize: 11, color: "#a8b08a" }}>
            ● SYSTEM STATUS: NOMINAL
          </div>
        </div>
      </div>

      {/* Engineering mode indicator */}
      <div
        style={{
          position: "absolute",
          top: 76,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "5px 10px",
          background: "rgba(18,20,17,.92)",
          border: "1px solid rgba(201,180,88,.32)",
          color: "#c9b458",
          fontSize: 9,
          letterSpacing: 1.2,
          fontWeight: 700,
          pointerEvents: "none",
        }}
      >
        ENGINEERING INSPECTION MODE
      </div>

      {/* Left component browser */}
      {showList && (
        <div
          style={{
            position: "absolute",
            top: 82,
            left: 16,
            bottom: 72,
            width: 245,
            background: "rgba(22, 24, 21, 0.9)",
            border: "1px solid rgba(220,218,205,0.10)",
            borderRadius: 3,
            backdropFilter: "blur(3px)",
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,.28)",
          }}
        >
          <div style={{ padding: 13, borderBottom: "1px solid rgba(220,218,205,.08)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
              COMPONENT REGISTER
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search component..."
              style={{
                marginTop: 10,
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                borderRadius: 2,
                border: "1px solid rgba(220,218,205,.1)",
                background: "rgba(220,218,205,.05)",
                color: "white",
                outline: "none",
                fontSize: 11,
              }}
            />
          </div>

          <div style={{ overflowY: "auto", height: "calc(100% - 91px)" }}>
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  border: 0,
                  borderBottom: "1px solid rgba(220,218,205,.045)",
                  background:
                    selected === item.id
                      ? "rgba(201,180,88,.12)"
                      : "transparent",
                  color: "white",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: statusColor(item.status),
                    boxShadow: `0 0 7px ${statusColor(item.status)}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 11 }}>{item.name}</span>
                <span style={{ fontSize: 10, opacity: 0.55 }}>{item.health}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right detail panel */}
      {showInfo && selectedInfo && (
        <div
          style={{
            position: "absolute",
            top: 82,
            right: 16,
            width: 280,
            padding: 16,
            background: "rgba(22, 24, 21, 0.93)",
            border: "1px solid rgba(201,180,88,.22)",
            borderRadius: 3,
            backdropFilter: "blur(3px)",
            boxShadow: "0 8px 24px rgba(0,0,0,.28)",
          }}
        >
          <div style={{ fontSize: 9, opacity: 0.5, letterSpacing: 1.5 }}>
            COMPONENT ASSESSMENT
          </div>
          <div style={{ marginTop: 5, fontSize: 19, fontWeight: 800 }}>
            {selectedInfo.name}
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 2,
              background: `${statusColor(selectedInfo.status)}12`,
              border: `1px solid ${statusColor(selectedInfo.status)}44`,
              color: statusColor(selectedInfo.status),
              fontWeight: 800,
              fontSize: 11,
            }}
          >
            ● {selectedInfo.status}
          </div>

          <div style={{ marginTop: 15, fontSize: 10, opacity: 0.55 }}>
            CONDITION ASSESSMENT
          </div>
          <div style={{ marginTop: 5, fontSize: 29, fontWeight: 800 }}>
            {selectedInfo.health}%
          </div>

          <div
            style={{
              height: 5,
              borderRadius: 2,
              background: "rgba(220,218,205,.08)",
              overflow: "hidden",
              marginTop: 6,
            }}
          >
            <div
              style={{
                width: `${selectedInfo.health}%`,
                height: "100%",
                background: statusColor(selectedInfo.status),
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 7,
              marginTop: 15,
            }}
          >
            {[
              ["TEMP", `${selectedInfo.temperature}°C`],
              ["VIB", `${selectedInfo.vibration} mm/s`],
              ["PRESS", `${selectedInfo.pressure} bar`],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: 8,
                  borderRadius: 2,
                  background: "rgba(220,218,205,.045)",
                }}
              >
                <div style={{ fontSize: 8, opacity: 0.5 }}>{label}</div>
                <div style={{ marginTop: 5, fontSize: 11, fontWeight: 700 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setSelected(null)}
            style={{
              width: "100%",
              marginTop: 15,
              padding: 9,
              borderRadius: 2,
              border: "1px solid rgba(220,218,205,.1)",
              background: "rgba(220,218,205,.04)",
              color: "white",
              cursor: "pointer",
              fontSize: 10,
            }}
          >
            CLEAR ASSESSMENT
          </button>
        </div>
      )}

      {/* Bottom controls */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 7,
          padding: 7,
          background: "rgba(13,15,13,.92)",
          border: "1px solid rgba(220,218,205,.1)",
          borderRadius: 3,
          backdropFilter: "blur(3px)",
        }}
      >
        {[
          ["COMPONENTS", () => setShowList((v) => !v)],
          ["ASSESSMENT", () => setShowInfo((v) => !v)],
          ["RESET CAMERA", resetView],
          ["3D MODEL", () => setVisible((v) => !v)],
        ].map(([label, action]: any) => (
          <button
            key={label}
            onClick={action}
            style={{
              padding: "8px 11px",
              borderRadius: 2,
              border: "1px solid rgba(220,218,205,.1)",
              background: "rgba(220,218,205,.045)",
              color: "rgba(220,218,205,.82)",
              cursor: "pointer",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 19,
          right: 16,
          fontSize: 9,
          opacity: 0.45,
          pointerEvents: "none",
        }}
      >
        CLICK: ASSESS • DOUBLE-CLICK: FOCUS • R: RESET • ESC: CLEAR
      </div>

      {!selected && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 78,
            transform: "translateX(-50%)",
            padding: "7px 12px",
            borderRadius: 2,
            background: "rgba(22,24,21,.72)",
            border: "1px solid rgba(201,180,88,.16)",
            fontSize: 10,
            opacity: 0.7,
            pointerEvents: "none",
          }}
        >
          SELECT COMPONENT FOR ASSESSMENT
        </div>
      )}
    </div>
  );
}

useGLTF.preload(MODEL_3D_PATH);
