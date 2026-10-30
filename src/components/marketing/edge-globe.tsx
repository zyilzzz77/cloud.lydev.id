import { cn } from "@/lib/utils";

/**
 * Orthographic dot-matrix globe.
 *
 * Every dot is a (latitude, longitude) sample of a unit sphere, and orthographic
 * projection simply drops the depth axis:
 *
 *   x = cx + R * cos(lat) * sin(lon)
 *   y = cy - R * sin(lat)
 *   z = cos(lat) * cos(lon)          // +1 faces the viewer, 0 at the limb
 *
 * Only the viewer-facing hemisphere is kept, and z drives each dot's radius and
 * opacity so the field thins out toward the silhouette and fakes curvature.
 * The grid is built once at module scope, so the markup is fully deterministic
 * and identical between the server render and hydration.
 */

type GlobeDot = {
  readonly id: string;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly opacity: number;
};

type EdgeArc = {
  readonly id: string;
  readonly d: string;
  readonly fromX: number;
  readonly fromY: number;
  readonly delay: string;
};

type EdgeNode = {
  readonly id: string;
  readonly city: string;
  readonly latency: string;
  readonly position: string;
  readonly visibleOnMobile: boolean;
};

const GLOBE_RADIUS = 100;
const GLOBE_CENTER = 100;
const LATITUDE_STEP = 8;
const LONGITUDE_STEP = 8;

/** Rounds to 2 decimals so the serialized markup stays short and stable. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildGlobeDots(): readonly GlobeDot[] {
  const dots: GlobeDot[] = [];

  for (let lat = -80; lat <= 80; lat += LATITUDE_STEP) {
    const phi = (lat * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    for (let lon = 0; lon < 360; lon += LONGITUDE_STEP) {
      const theta = (lon * Math.PI) / 180;
      const depth = cosPhi * Math.cos(theta);

      // Back hemisphere: it is fully hidden behind the front one.
      if (depth < 0) {
        continue;
      }

      const cx = GLOBE_CENTER + GLOBE_RADIUS * cosPhi * Math.sin(theta);
      const cy = GLOBE_CENTER - GLOBE_RADIUS * sinPhi;

      // Guard against anything landing outside the disc (numerical safety).
      if (Math.hypot(cx - GLOBE_CENTER, cy - GLOBE_CENTER) > GLOBE_RADIUS - 0.5) {
        continue;
      }

      dots.push({
        id: `${lat}_${lon}`,
        cx: round(cx),
        cy: round(cy),
        r: round(0.5 + depth * 1.05),
        opacity: round(0.18 + depth * 0.57),
      });
    }
  }

  return dots;
}

const GLOBE_DOTS = buildGlobeDots();

const EDGE_ARCS: readonly EdgeArc[] = [
  { id: "jkt-tyo", d: "M 34 128 C 58 54 128 44 168 92", fromX: 34, fromY: 128, delay: "0s" },
  { id: "sin-hkg", d: "M 62 158 C 96 118 118 88 156 66", fromX: 62, fromY: 158, delay: "2.2s" },
  { id: "lax-fra", d: "M 40 96 C 74 26 138 30 172 118", fromX: 40, fromY: 96, delay: "4.4s" },
  { id: "syd-sin", d: "M 70 44 C 104 78 128 112 150 156", fromX: 70, fromY: 44, delay: "6.6s" },
];

const EDGE_NODES: readonly EdgeNode[] = [
  { id: "sin", city: "Singapore", latency: "18ms", position: "left-0 top-[16%]", visibleOnMobile: true },
  { id: "jkt", city: "Jakarta", latency: "12ms", position: "left-[2%] top-[62%]", visibleOnMobile: true },
  { id: "tyo", city: "Tokyo", latency: "65ms", position: "right-0 top-[30%]", visibleOnMobile: true },
  { id: "fra", city: "Frankfurt", latency: "160ms", position: "right-[4%] top-[64%]", visibleOnMobile: false },
  { id: "lax", city: "Los Angeles", latency: "180ms", position: "left-[6%] top-[2%]", visibleOnMobile: false },
];

/**
 * Static keyframes. Kept as a plain string constant (no interpolation, no
 * dangerouslySetInnerHTML) so the server component renders it verbatim.
 */
const EDGE_GLOBE_CSS = `
@keyframes eg-turn {
  0%, 100% { transform: translate3d(-0.6%, 0, 0) scaleX(1); }
  50% { transform: translate3d(0.6%, 0, 0) scaleX(0.985); }
}
@keyframes eg-breathe {
  0%, 100% { opacity: 0.05; transform: scale(0.94); }
  50% { opacity: 0.12; transform: scale(1.04); }
}
@keyframes eg-arc {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: 100; }
}
`;

export function EdgeGlobe({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Global edge network map"
      className={cn("relative w-full", className)}
    >
      <style>{EDGE_GLOBE_CSS}</style>

      <div aria-hidden="true" className="relative w-full select-none [perspective:900px]">
        {/* Breathing halo behind the sphere. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square rounded-full bg-[radial-gradient(circle_at_50%_50%,currentColor_0%,transparent_68%)] text-foreground opacity-[0.08] blur-2xl animate-[eg-breathe_9s_ease-in-out_infinite] motion-reduce:animate-none" />

        <svg
          viewBox="-12 0 224 236"
          className="relative h-auto w-full text-foreground"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <path id="edge-globe-label-arc" d="M 40 224 A 170 170 0 0 1 160 224" fill="none" />
          </defs>

          {/* Sphere silhouette. */}
          <circle
            cx={GLOBE_CENTER}
            cy={GLOBE_CENTER}
            r={GLOBE_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.14}
            strokeWidth={0.5}
          />

          {/* Dot matrix, slowly shimmering as if the sphere were turning. */}
          <g className="origin-center [transform-box:fill-box] [transform-style:preserve-3d] animate-[eg-turn_26s_ease-in-out_infinite] motion-reduce:animate-none">
            {GLOBE_DOTS.map((dot) => (
              <circle
                key={dot.id}
                cx={dot.cx}
                cy={dot.cy}
                r={dot.r}
                fill="currentColor"
                fillOpacity={dot.opacity}
              />
            ))}
          </g>

          {/* Connection arcs: a faint track plus a travelling signal dash. */}
          <g fill="none" stroke="currentColor" strokeLinecap="round">
            {EDGE_ARCS.map((arc) => (
              <g key={arc.id}>
                <path d={arc.d} strokeWidth={0.4} strokeOpacity={0.12} />
                <path
                  d={arc.d}
                  pathLength={100}
                  strokeWidth={0.7}
                  strokeOpacity={0.4}
                  strokeDasharray="6 94"
                  className="animate-[eg-arc_9s_linear_infinite] motion-reduce:animate-none"
                  style={{ animationDelay: arc.delay }}
                />
              </g>
            ))}
          </g>

          {/* Arc origins. */}
          <g fill="currentColor" fillOpacity={0.45}>
            {EDGE_ARCS.map((arc) => (
              <circle key={arc.id} cx={arc.fromX} cy={arc.fromY} r={1.1} />
            ))}
          </g>

          {/* Curved technical label riding the lower edge of the sphere. */}
          <text
            className="fill-muted-foreground"
            fillOpacity={0.85}
            fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            fontSize={7}
            letterSpacing={2.1}
          >
            <textPath href="#edge-globe-label-arc" startOffset="50%" textAnchor="middle">
              NODE EDGE CDN / GLOBAL
            </textPath>
          </text>
        </svg>

        {EDGE_NODES.map((node) => (
          <span
            key={node.id}
            className={cn(
              "absolute items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-1 font-mono text-[10px] leading-none whitespace-nowrap text-foreground shadow-sm backdrop-blur-sm",
              node.visibleOnMobile ? "flex" : "hidden sm:flex",
              node.position,
            )}
          >
            <span className="relative flex size-1.5 shrink-0">
              <span className="absolute inset-0 rounded-full bg-foreground/50 animate-ping motion-reduce:animate-none" />
              <span className="relative size-1.5 rounded-full bg-foreground/80" />
            </span>
            {node.city}
            <span className="text-muted-foreground">{node.latency}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
