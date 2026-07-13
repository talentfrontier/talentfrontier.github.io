import { useColorScheme } from "react-native";

/** Same role-based palette as the web dashboard (validated reference set). */
export interface Theme {
  plane: string;
  surface: string;
  ink: string;
  ink2: string;
  muted: string;
  hairline: string;
  brand: string;
  series2: string;
  good: string;
  warning: string;
  critical: string;
}

const light: Theme = {
  plane: "#f9f9f7",
  surface: "#fcfcfb",
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  hairline: "#e1e0d9",
  brand: "#2a78d6",
  series2: "#1baf7a",
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

const dark: Theme = {
  plane: "#0d0d0d",
  surface: "#1a1a19",
  ink: "#ffffff",
  ink2: "#c3c2b7",
  muted: "#898781",
  hairline: "#2c2c2a",
  brand: "#3987e5",
  series2: "#199e70",
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
