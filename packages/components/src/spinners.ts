// Curated spinner presets. Inclusion bar matches vue-tui:
// universal default + functional fallback only, with width-safe one-column frames.
export const PRESETS = {
  dots: { interval: 80, frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] },
  line: { interval: 130, frames: ["-", "\\", "|", "/"] },
} satisfies Record<string, { interval: number; frames: readonly string[] }>;

export type PresetName = keyof typeof PRESETS;

export function resolveSpinner(opts: {
  type?: string;
  frames?: readonly string[];
  interval?: number;
}): { frames: readonly string[]; interval: number } {
  if (opts.frames?.length) {
    return { frames: [...opts.frames], interval: opts.interval ?? 80 };
  }
  const preset = PRESETS[opts.type as PresetName] ?? PRESETS.dots;
  return { frames: preset.frames, interval: opts.interval ?? preset.interval };
}
