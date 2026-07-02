import type { PresetName } from "./spinners.ts";

export interface SpinnerProps {
  type?: PresetName;
  frames?: readonly string[];
  interval?: number;
  color?: string;
  label?: string;
}
