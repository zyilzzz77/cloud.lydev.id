"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { feature } from "topojson-client";
import landData from "world-atlas/land-110m.json";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import type { Topology } from "topojson-specification";
import type { Mesh, MeshBasicMaterial } from "three";
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  CubicBezierCurve3,
  DoubleSide,
  MathUtils,
  NormalBlending,
  PerspectiveCamera,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import { cn } from "@/lib/utils";

const GLOBE_RADIUS = 2.05;
const BLUE = "#3B82F6";

type NodeId =
  | "jakarta"
  | "singapore"
  | "tokyo"
  | "frankfurt"
  | "los-angeles"
  | "sydney"
  | "mumbai"
  | "dubai"
  | "london"
  | "new-york"
  | "sao-paulo"
  | "cape-town";

type EdgeNodeData = {
  id: NodeId;
  city: string;
  lat: number;
  lng: number;
  latency: number;
  tier: "Primary Hub" | "Edge Node";
  color: string;
};

const NODES: readonly EdgeNodeData[] = [
  { id: "jakarta", city: "Jakarta", lat: -6.2088, lng: 106.8456, latency: 8, tier: "Primary Hub", color: "#10B981" },
  { id: "singapore", city: "Singapore", lat: 1.3521, lng: 103.8198, latency: 10, tier: "Primary Hub", color: "#10B981" },
  { id: "tokyo", city: "Tokyo", lat: 35.6762, lng: 139.6503, latency: 22, tier: "Edge Node", color: "#10B981" },
  { id: "sydney", city: "Sydney", lat: -33.8688, lng: 151.2093, latency: 18, tier: "Edge Node", color: "#10B981" },
  { id: "mumbai", city: "Mumbai", lat: 19.076, lng: 72.8777, latency: 16, tier: "Edge Node", color: "#10B981" },
  { id: "dubai", city: "Dubai", lat: 25.2048, lng: 55.2708, latency: 24, tier: "Edge Node", color: "#10B981" },
  { id: "frankfurt", city: "Frankfurt", lat: 50.1109, lng: 8.6821, latency: 32, tier: "Edge Node", color: "#10B981" },
  { id: "london", city: "London", lat: 51.5074, lng: -0.1278, latency: 31, tier: "Edge Node", color: "#10B981" },
  { id: "cape-town", city: "Cape Town", lat: -33.9249, lng: 18.4241, latency: 38, tier: "Edge Node", color: "#10B981" },
  { id: "new-york", city: "New York", lat: 40.7128, lng: -74.006, latency: 35, tier: "Edge Node", color: "#10B981" },
  { id: "los-angeles", city: "Los Angeles", lat: 34.0522, lng: -118.2437, latency: 28, tier: "Edge Node", color: "#10B981" },
  { id: "sao-paulo", city: "São Paulo", lat: -23.5505, lng: -46.6333, latency: 37, tier: "Edge Node", color: "#10B981" },
];

const NODE_MAP = Object.fromEntries(NODES.map((node) => [node.id, node])) as Record<NodeId, EdgeNodeData>;
const ARCS: readonly (readonly [NodeId, NodeId])[] = [
  ["jakarta", "singapore"],
  ["jakarta", "tokyo"],
  ["singapore", "sydney"],
  ["singapore", "mumbai"],
  ["mumbai", "dubai"],
  ["dubai", "frankfurt"],
  ["dubai", "cape-town"],
  ["frankfurt", "london"],
  ["london", "new-york"],
  ["new-york", "los-angeles"],
  ["new-york", "sao-paulo"],
  ["tokyo", "los-angeles"],
];

function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS) {
  const latitude = MathUtils.degToRad(lat);
  const longitude = MathUtils.degToRad(lng);

  // SphereGeometry places longitude 0 at +X and uses equirectangular UVs.
  const theta = longitude + Math.PI;

  return new Vector3(
    -radius * Math.cos(latitude) * Math.cos(theta),
    radius * Math.sin(latitude),
    radius * Math.cos(latitude) * Math.sin(theta),
  );
}

function tracePolygon(context: CanvasRenderingContext2D, polygon: Position[][], width: number, height: number) {
  context.beginPath();
  for (const ring of polygon) {
    ring.forEach(([lng = 0, lat = 0], index) => {
      const x = ((lng + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
  }
  context.fill("evenodd");
}

/** Builds a high-density dot-matrix land texture from Natural Earth geometry. */
function createLandTexture(dark: boolean) {
  const width = 2048;
  const height = 1024;
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const maskContext = mask.getContext("2d", { willReadFrequently: true });
  if (!maskContext) throw new Error("Canvas 2D is unavailable");

  const topology = landData as unknown as Topology;
  const land = feature(topology, topology.objects.land!) as
    | Feature<Polygon | MultiPolygon>
    | FeatureCollection<Polygon | MultiPolygon>;
  const geometries = land.type === "FeatureCollection"
    ? land.features.map((item) => item.geometry)
    : [land.geometry];

  maskContext.fillStyle = "#ffffff";
  for (const geometry of geometries) {
    if (geometry.type === "Polygon") {
      tracePolygon(maskContext, (geometry as Polygon).coordinates, width, height);
    } else if (geometry.type === "MultiPolygon") {
      for (const polygon of (geometry as MultiPolygon).coordinates) {
        tracePolygon(maskContext, polygon, width, height);
      }
    }
  }

  const pixels = maskContext.getImageData(0, 0, width, height).data;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");

  context.fillStyle = dark ? "#082b49" : "#b9e2f5";
  context.fillRect(0, 0, width, height);
  context.fillStyle = dark ? "#34d399" : "#22c55e";

  const step = 4;
  for (let y = 2; y < height; y += step) {
    for (let x = 2; x < width; x += step) {
      if ((pixels[(y * width + x) * 4 + 3] ?? 0) > 100) {
        context.beginPath();
        context.arc(x, y, 1.6, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const atmosphereVertexShader = [
  "varying vec3 vWorldNormal;",
  "varying vec3 vWorldPosition;",
  "void main() {",
  "  vec4 worldPosition = modelMatrix * vec4(position, 1.0);",
  "  vWorldPosition = worldPosition.xyz;",
  "  vWorldNormal = normalize(mat3(modelMatrix) * normal);",
  "  gl_Position = projectionMatrix * viewMatrix * worldPosition;",
  "}",
].join("\n");

const atmosphereFragmentShader = [
  "uniform vec3 glowColor;",
  "uniform float glowStrength;",
  "varying vec3 vWorldNormal;",
  "varying vec3 vWorldPosition;",
  "void main() {",
  "  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);",
  "  float rim = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), 2.6);",
  "  gl_FragColor = vec4(glowColor, rim * glowStrength);",
  "}",
].join("\n");

function Earth({ dark }: { dark: boolean }) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  const atmosphereUniforms = useMemo(() => ({
    glowColor: { value: new Color(dark ? "#38bdf8" : BLUE) },
    glowStrength: { value: dark ? 0.55 : 0.14 },
  }), [dark]);

  // Painting the 2048x1024 dot matrix blocks the main thread for a beat. Yield a
  // frame first so the plain sphere paints, then swap in the texture.
  useEffect(() => {
    let cancelled = false;
    let created: CanvasTexture | null = null;

    const frame = window.requestAnimationFrame(() => {
      created = createLandTexture(dark);

      if (cancelled) {
        created.dispose();
        return;
      }

      setTexture(created);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      created?.dispose();
    };
  }, [dark]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 96]} />
        {/* Re-keying the material rebuilds the shader once the map exists; a
            plain prop update would leave USE_MAP out of the compiled program. */}
        <meshStandardMaterial
          key={texture ? "land" : "plain"}
          map={texture ?? undefined}
          color={texture ? "#ffffff" : dark ? "#0d2a41" : "#dbeafe"}
          roughness={0.86}
          metalness={dark ? 0.12 : 0.02}
          emissiveMap={texture ?? undefined}
          emissive={texture ? (dark ? "#1d4d6e" : "#dbeafe") : "#000000"}
          emissiveIntensity={dark ? 0.28 : 0.62}
        />
      </mesh>
      <mesh scale={1.045}>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={atmosphereUniforms}
          transparent
          side={BackSide}
          blending={dark ? AdditiveBlending : NormalBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Ripple({ primary, reducedMotion }: { primary: boolean; reducedMotion: boolean }) {
  const ring = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ring.current || !material.current) return;
    const phase = reducedMotion ? 0.35 : (clock.elapsedTime * (primary ? 0.72 : 0.4)) % 1;
    const scale = 1 + phase * 2.5;
    ring.current.scale.setScalar(scale);
    material.current.opacity = reducedMotion ? 0.35 : (1 - phase) * 0.8;
  });

  return (
    <mesh ref={ring} position={[0, 0, 0.012]}>
      <ringGeometry args={[0.06, 0.074, 48]} />
      <meshBasicMaterial ref={material} color={BLUE} transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}

type EdgeNodeProps = {
  node: EdgeNodeData;
  hovered: boolean;
  reducedMotion: boolean;
};

function EdgeNode({ node, hovered, reducedMotion }: EdgeNodeProps) {
  const position = useMemo(() => latLngToVector3(node.lat, node.lng), [node.lat, node.lng]);
  const normal = useMemo(() => position.clone().normalize(), [position]);
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal),
    [normal],
  );
  const primary = node.tier === "Primary Hub";
  const pillarHeight = primary ? 0.32 : 0.25;

  return (
    <group position={position} quaternion={quaternion}>
      <mesh position={[0, 0, 0.035]}>
        <sphereGeometry args={[0.045, 24, 24]} />
        <meshBasicMaterial color={node.color} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <sphereGeometry args={[0.085, 20, 20]} />
        <meshBasicMaterial color={node.color} transparent opacity={hovered ? 0.36 : 0.17} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, pillarHeight / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.018, pillarHeight, 12]} />
        <meshBasicMaterial color={node.color} transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 0, pillarHeight]}>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshBasicMaterial color={node.color} transparent opacity={0.8} />
      </mesh>

      <group scale={primary ? 1 : 0.85}>
        <Ripple primary={primary} reducedMotion={reducedMotion} />
      </group>

    </group>
  );
}

function createArc(from: EdgeNodeData, to: EdgeNodeData) {
  const start = latLngToVector3(from.lat, from.lng);
  const end = latLngToVector3(to.lat, to.lng);
  const distance = start.distanceTo(end);
  const middle = start.clone().add(end).multiplyScalar(0.5).normalize()
    .multiplyScalar(GLOBE_RADIUS + Math.max(0.28, distance * 0.32));

  return new CubicBezierCurve3(
    start,
    start.clone().lerp(middle, 0.72),
    end.clone().lerp(middle, 0.72),
    end,
  );
}

function DataArc({
  from,
  to,
  active,
  reducedMotion,
  index,
}: {
  from: NodeId;
  to: NodeId;
  active: boolean;
  reducedMotion: boolean;
  index: number;
}) {
  const particle = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const curve = useMemo(() => createArc(NODE_MAP[from], NODE_MAP[to]), [from, to]);
  const color = NODE_MAP[from].color;

  useFrame(({ clock }) => {
    if (material.current) {
      material.current.opacity = MathUtils.lerp(material.current.opacity, active ? 0.96 : 0.3, 0.12);
    }
    if (particle.current) {
      const progress = reducedMotion ? 0.5 : (clock.elapsedTime * 0.12 + index * 0.19) % 1;
      particle.current.position.copy(curve.getPointAt(progress));
    }
  });

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 96, 0.009, 6, false]} />
        <meshBasicMaterial ref={material} color={color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={particle}>
        <sphereGeometry args={[active ? 0.035 : 0.025, 16, 16]} />
        <meshBasicMaterial color={active ? "#ffffff" : color} />
      </mesh>
    </group>
  );
}

type BadgeRefs = {
  current: Partial<Record<NodeId, HTMLDivElement | null>>;
};

function ResponsiveCamera() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || size.width === 0 || size.height === 0) return;

    const halfFov = Math.tan(MathUtils.degToRad(camera.fov / 2));
    const aspect = size.width / size.height;
    const fitRadius = 2.55;
    const distance = Math.max(8.8, fitRadius / halfFov, fitRadius / (halfFov * aspect));

    camera.position.normalize().multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

type BadgeLayout = {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  badgeWidth: number;
  badgeHeight: number;
  scale: number;
  isFront: boolean;
  isHovered: boolean;
};

function updateBadge(element: HTMLDivElement, layout: BadgeLayout) {
  const {
    x,
    y,
    viewportWidth,
    viewportHeight,
    badgeWidth,
    badgeHeight,
    scale,
    isFront,
    isHovered,
  } = layout;
  const halfWidth = badgeWidth / 2;
  const halfHeight = badgeHeight / 2;
  const safeX = MathUtils.clamp(
    x,
    halfWidth + 8,
    Math.max(halfWidth + 8, viewportWidth - halfWidth - 8),
  );
  const safeY = MathUtils.clamp(
    y,
    halfHeight + 8,
    Math.max(halfHeight + 8, viewportHeight - halfHeight - 8),
  );

  element.style.transform =
    "translate3d(" + safeX + "px," + safeY + "px,0) translate(-50%,-50%) scale(" + scale + ")";
  element.style.opacity = isFront ? "1" : "0";
  element.style.visibility = isFront ? "visible" : "hidden";
  element.style.pointerEvents = isFront ? "auto" : "none";
  element.style.zIndex = isHovered ? "30" : "10";
  // `inert` is what actually keeps a badge on the far side of the globe out of
  // the tab order and the accessibility tree.
  element.inert = !isFront;
  element.setAttribute("aria-hidden", String(!isFront));
}

function BadgeProjector({
  badgeRefs,
  hovered,
  onHover,
}: {
  badgeRefs: BadgeRefs;
  hovered: NodeId | null;
  onHover: (id: NodeId | null) => void;
}) {
  const markers = useMemo(
    () => NODES.map((node) => {
      const surface = latLngToVector3(node.lat, node.lng);
      const pillarHeight = node.tier === "Primary Hub" ? 0.32 : 0.25;
      const badgePosition = surface.clone().normalize()
        .multiplyScalar(GLOBE_RADIUS + pillarHeight + 0.19);
      return { node, normal: surface.normalize(), badgePosition };
    }),
    [],
  );

  // Reading offsetWidth every frame forces a synchronous layout per badge, so
  // measure once and only re-measure when the viewport actually changes.
  const sizes = useRef<Record<string, { width: number; height: number }>>({});
  const viewport = useRef({ width: 0, height: 0 });

  useFrame(({ camera, size }) => {
    if (viewport.current.width !== size.width || viewport.current.height !== size.height) {
      viewport.current = { width: size.width, height: size.height };
      sizes.current = {};
    }

    const cameraDirection = camera.position.clone().normalize();
    const frontBadges: Array<{
      element: HTMLDivElement;
      x: number;
      y: number;
      width: number;
      height: number;
      isHovered: boolean;
    }> = [];

    for (const { node, normal, badgePosition } of markers) {
      const element = badgeRefs.current[node.id];
      if (!element) continue;

      let measured = sizes.current[node.id];
      if (!measured) {
        measured = { width: element.offsetWidth, height: element.offsetHeight };
        sizes.current[node.id] = measured;
      }

      const projected = badgePosition.clone().project(camera);
      const isFront = normal.dot(cameraDirection) > 0.05 && projected.z > -1 && projected.z < 1;
      const isHovered = hovered === node.id;
      if (!isFront && isHovered) onHover(null);

      if (!isFront) {
        updateBadge(element, {
          x: 0,
          y: 0,
          viewportWidth: size.width,
          viewportHeight: size.height,
          badgeWidth: measured.width,
          badgeHeight: measured.height,
          scale: 0.85,
          isFront: false,
          isHovered: false,
        });
        continue;
      }

      frontBadges.push({
        element,
        x: (projected.x * 0.5 + 0.5) * size.width,
        y: (-projected.y * 0.5 + 0.5) * size.height,
        width: measured.width * (isHovered ? 1.08 : 1),
        height: measured.height * (isHovered ? 1.08 : 1),
        isHovered,
      });
    }

    frontBadges.sort((a, b) => a.y - b.y);
    const placed: Array<{ left: number; right: number; top: number; bottom: number }> = [];

    for (const badge of frontBadges) {
      let y = badge.y;
      for (let attempt = 0; attempt < 14; attempt += 1) {
        const candidate = {
          left: badge.x - badge.width / 2,
          right: badge.x + badge.width / 2,
          top: y - badge.height / 2,
          bottom: y + badge.height / 2,
        };
        const overlaps = placed.some((rect) =>
          candidate.left < rect.right + 4 &&
          candidate.right > rect.left - 4 &&
          candidate.top < rect.bottom + 4 &&
          candidate.bottom > rect.top - 4
        );
        if (!overlaps) break;
        y = badge.y + (attempt + 1) * (badge.height + 5);
      }

      updateBadge(badge.element, {
        x: badge.x,
        y,
        viewportWidth: size.width,
        viewportHeight: size.height,
        badgeWidth: badge.width,
        badgeHeight: badge.height,
        scale: badge.isHovered ? 1.08 : 1,
        isFront: true,
        isHovered: badge.isHovered,
      });
      placed.push({
        left: badge.x - badge.width / 2,
        right: badge.x + badge.width / 2,
        top: y - badge.height / 2,
        bottom: y + badge.height / 2,
      });
    }
  });

  return null;
}

function GlobeScene({
  hovered,
  onHover,
  reducedMotion,
  badgeRefs,
  dark,
}: {
  hovered: NodeId | null;
  onHover: (id: NodeId | null) => void;
  reducedMotion: boolean;
  badgeRefs: BadgeRefs;
  dark: boolean;
}) {
  const seaLight = useMemo(() => latLngToVector3(4, 108, 3.4).toArray(), []);

  return (
    <>
      <ResponsiveCamera />
      <ambientLight intensity={dark ? 0.55 : 0.8} color={dark ? "#8bb8e8" : "#eef6ff"} />
      <directionalLight position={[-4, 6, 5]} intensity={dark ? 1.05 : 1.35} color="#ffffff" />
      <pointLight position={seaLight} intensity={dark ? 7 : 2.2} distance={5} color={BLUE} />
      <Earth dark={dark} />
      <BadgeProjector badgeRefs={badgeRefs} hovered={hovered} onHover={onHover} />
      {ARCS.map(([from, to], index) => (
        <DataArc
          key={from + "-" + to}
          from={from}
          to={to}
          index={index}
          active={hovered === from || hovered === to}
          reducedMotion={reducedMotion}
        />
      ))}
      {NODES.map((node) => (
        <EdgeNode
          key={node.id}
          node={node}
          hovered={hovered === node.id}
          reducedMotion={reducedMotion}
        />
      ))}
      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        autoRotate={!hovered && !reducedMotion}
        autoRotateSpeed={0.8}
        enableDamping
        dampingFactor={0.06}
        minPolarAngle={Math.PI * 0.22}
        maxPolarAngle={Math.PI * 0.78}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function EdgeGlobe3D() {
  const [hovered, setHovered] = useState<NodeId | null>(null);
  const [dark, setDark] = useState(false);
  const badgeRefs = useRef<Partial<Record<NodeId, HTMLDivElement | null>>>({});
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setDark(root.classList.contains("dark"));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative h-[440px] w-full sm:h-[540px] lg:h-[620px]">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/10 blur-3xl"
        aria-hidden="true"
      />
      <Canvas
        frameloop="always"
        dpr={[1, 1.75]}
        camera={{ position: latLngToVector3(14, 112, 8.8).toArray(), fov: 39, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        aria-label="Interactive 3D globe showing LYDEV CLOUD edge regions"
      >
        <GlobeScene
          hovered={hovered}
          onHover={setHovered}
          reducedMotion={reducedMotion}
          badgeRefs={badgeRefs}
          dark={dark}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-0" aria-label="Edge region telemetry">
        {NODES.map((node) => (
          <div
            key={node.id}
            ref={(element) => { badgeRefs.current[node.id] = element; }}
            data-region={node.id}
            className="invisible absolute left-0 top-0 opacity-0 transition-[opacity] duration-200 will-change-transform"
          >
            <div
              className="pointer-events-auto"
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                tabIndex={0}
                role="group"
                aria-label={node.city + ": " + node.latency + " milliseconds, " + node.tier}
                onFocus={() => setHovered(node.id)}
                onBlur={() => setHovered(null)}
                className={cn(
                  "cursor-default whitespace-nowrap border px-2 py-0.5 font-mono text-[10px] shadow-lg outline-none backdrop-blur-md focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-2.5 sm:py-1 sm:text-xs",
                  dark
                    ? "border-slate-700/90 bg-slate-900/90 text-slate-200"
                    : "border-slate-200/90 bg-white/90 text-slate-700",
                  hovered === node.id ? "rounded-xl" : "rounded-full",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  <span className="font-medium">{node.city}</span>
                  <span className={dark ? "text-slate-600" : "text-slate-300"} aria-hidden="true">|</span>
                  <span className="font-semibold text-emerald-500">{node.latency}ms</span>
                </span>
                <span
                  className={cn(
                    "grid transition-[grid-template-rows,opacity,margin] duration-200",
                    hovered === node.id ? "mt-1 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <span className={cn("overflow-hidden text-[9px]", dark ? "text-slate-400" : "text-slate-500")}>
                    Status: Active • Route: Direct Edge
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center sm:bottom-6">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 font-mono text-[10px] text-slate-600 shadow-sm backdrop-blur sm:text-xs dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-300">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" aria-hidden="true" />
          <span>{NODES.length} GLOBAL EDGE REGIONS ACTIVE</span>
          <span className="text-slate-300" aria-hidden="true">|</span>
          <span className="whitespace-nowrap">LOWEST PING: <strong className="font-semibold text-emerald-700 dark:text-emerald-400">8ms (JKT)</strong></span>
        </div>
      </div>
    </div>
  );
}
