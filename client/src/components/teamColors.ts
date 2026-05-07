// Jackbox-style bright team palette. Rotating 6 colors so a match can seat
// up to 6 duos and each gets its own visual identity. Tailwind classes are
// used so the build can tree-shake unused ones — keep the list small.
export interface TeamPalette {
  /** Solid bright background for team card / bar fill. */
  bg: string;
  /** Slightly darker ring / border accent. */
  ring: string;
  /** Text color that reads on `bg`. */
  text: string;
  /** Tailwind text class matching the color, used on dark backdrops. */
  textOn: string;
  /** Hex-ish label for emojis / flavor. */
  name: string;
}

const PALETTES: TeamPalette[] = [
  { bg: "bg-fuchsia-400", ring: "ring-fuchsia-300", text: "text-slate-900", textOn: "text-fuchsia-300", name: "Pink"   },
  { bg: "bg-cyan-400",    ring: "ring-cyan-300",    text: "text-slate-900", textOn: "text-cyan-300",    name: "Cyan"   },
  { bg: "bg-amber-400",   ring: "ring-amber-300",   text: "text-slate-900", textOn: "text-amber-300",   name: "Gold"   },
  { bg: "bg-emerald-400", ring: "ring-emerald-300", text: "text-slate-900", textOn: "text-emerald-300", name: "Lime"   },
  { bg: "bg-violet-400",  ring: "ring-violet-300",  text: "text-slate-900", textOn: "text-violet-300",  name: "Violet" },
  { bg: "bg-orange-400",  ring: "ring-orange-300",  text: "text-slate-900", textOn: "text-orange-300",  name: "Flame"  },
];

export function teamPalette(index: number): TeamPalette {
  return PALETTES[((index % PALETTES.length) + PALETTES.length) % PALETTES.length];
}
