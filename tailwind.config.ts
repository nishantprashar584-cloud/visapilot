import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          navy: "#09111f",
          blue: "#56ccf2",
          slate: "#0e1b31",
          mist: "#13253f",
          line: "rgba(148, 163, 184, 0.22)",
          ink: "#d9e7ff",
          cyan: "#6ee7f9",
          coral: "#ff8f70",
          gold: "#ffd166",
          lime: "#7ef29a",
          violet: "#9d7bff"
        },
      },
      boxShadow: {
        panel: "0 24px 70px -28px rgba(15, 23, 42, 0.35)",
        glow: "0 30px 120px -35px rgba(86, 204, 242, 0.35)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      },
      backgroundImage: {
        "hero-grid": "radial-gradient(circle at top, rgba(37,99,235,0.12), transparent 32%), linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px)",
        "aurora": "radial-gradient(circle at 20% 20%, rgba(86, 204, 242, 0.25), transparent 26%), radial-gradient(circle at 80% 0%, rgba(157, 123, 255, 0.28), transparent 22%), radial-gradient(circle at 50% 80%, rgba(255, 143, 112, 0.18), transparent 28%)",
      },
      backgroundSize: {
        "hero-grid": "auto, 28px 28px, 28px 28px",
        aurora: "cover",
      },
    },
  },
  plugins: [],
};
export default config;
