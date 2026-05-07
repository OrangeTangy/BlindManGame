/**
 * Procedural glyph renderer. Each id is a deterministic recipe — both the
 * guide's single big glyph and the blind's grid render via this component,
 * so client and server agree on identity. The recipe is intentionally
 * abstract so the guide has to invent verbal taxonomy to describe it.
 */

type ShapeKind = "circle" | "square" | "triangle" | "diamond" | "line";

interface Shape {
  kind: ShapeKind;
  rot: number;
  sx: number;
  sy: number;
  fill: string;
}

function recipeFor(id: number): { shapes: Shape[] } {
  const fills = [
    "#fde047", "#a3e635", "#67e8f9", "#f0abfc",
    "#fdba74", "#fda4af", "#bef264", "#5eead4",
  ];
  const shapeKinds: ShapeKind[] = ["circle", "square", "triangle", "diamond", "line"];
  const shape1 = shapeKinds[id % shapeKinds.length];
  const shape2 = shapeKinds[(Math.floor(id / 5) + 2) % shapeKinds.length];
  const rot1 = (id * 23) % 360;
  const rot2 = (id * 71 + 30) % 360;
  const fill1 = fills[(id + 1) % fills.length];
  const fill2 = fills[(id * 3 + 4) % fills.length];
  return {
    shapes: [
      { kind: shape1, rot: rot1, sx: 1.0, sy: 1.0, fill: fill1 },
      { kind: shape2, rot: rot2, sx: 0.55, sy: 0.55, fill: fill2 },
    ],
  };
}

function ShapeNode({ kind, rot, sx, sy, fill }: Shape) {
  const cx = 50;
  const cy = 50;
  const transform = `translate(${cx}, ${cy}) rotate(${rot}) scale(${sx}, ${sy}) translate(-${cx}, -${cy})`;
  if (kind === "circle") {
    return <circle cx={cx} cy={cy} r={28} fill={fill} stroke="#0f172a" strokeWidth={4} transform={transform} />;
  }
  if (kind === "square") {
    return <rect x={20} y={20} width={60} height={60} fill={fill} stroke="#0f172a" strokeWidth={4} transform={transform} />;
  }
  if (kind === "triangle") {
    return <polygon points="50,18 82,78 18,78" fill={fill} stroke="#0f172a" strokeWidth={4} transform={transform} />;
  }
  if (kind === "diamond") {
    return <polygon points="50,16 84,50 50,84 16,50" fill={fill} stroke="#0f172a" strokeWidth={4} transform={transform} />;
  }
  return <rect x={16} y={45} width={68} height={10} fill={fill} stroke="#0f172a" strokeWidth={4} transform={transform} />;
}

export default function Glyph({ id, size = 80 }: { id: number; size?: number }) {
  const r = recipeFor(id);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      {r.shapes.map((s, i) => <ShapeNode key={i} {...s} />)}
    </svg>
  );
}
