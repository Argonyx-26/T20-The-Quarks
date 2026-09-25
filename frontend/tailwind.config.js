/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        display: ["Space Grotesk", "IBM Plex Sans", "system-ui", "sans-serif"],
      },
      colors: {
        // White / cool-grey canvas with teal reserved for brand, CTAs and
        // active/interactive states -- not a fill color for whole sections.
        base: {
          900: "#DDE4E4", // soft grey -- deepest inset tone
          800: "#F8FAFA", // page background -- near-white
          700: "#FFFFFF", // pure light surface -- panels
          600: "#E9EEEE", // cool grey surface -- nested / hover
          500: "#F1F4F4", // alt section background
        },
        line: {
          DEFAULT: "rgba(18,55,54,0.12)",
          soft: "rgba(18,55,54,0.07)",
          strong: "rgba(18,55,54,0.20)",
        },
        ink: {
          DEFAULT: "#121718", // primary text -- graphite
          muted: "#465253", // secondary text
          faint: "#697576", // metadata text
        },
        teal: {
          DEFAULT: "#0F7A75", // primary brand / CTA
          dark: "#08645F", // strong / hover
          bright: "#1B9A92", // accent
          pale: "#D9EFEC",
          ultrapale: "#EDF8F6",
        },
        amber: {
          DEFAULT: "#B98232",
          soft: "#8F6425",
        },
        status: {
          ok: "#3C8B72",
          warn: "#B98232",
          critical: "#C95F59",
          offline: "#8A9596",
        },
        source: {
          vision: "#4779BD",
          endpoint: "#765BAA",
          network: "#168B84",
        },
      },
      boxShadow: {
        none: "none",
        panel: "0 8px 30px rgba(22,40,40,0.06)",
      },
      borderRadius: {
        sm: "4px", // brief's radius floor; `rounded-full` (dots/pills) is unaffected
      },
      transitionDuration: {
        fast: "120ms",
        normal: "220ms",
        context: "400ms",
        incident: "700ms",
      },
      keyframes: {
        pulse_dot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        reveal: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        flash: {
          "0%": { backgroundColor: "rgba(185,132,45,0.14)" },
          "100%": { backgroundColor: "transparent" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        rise_sm: {
          "0%": { opacity: "0", transform: "translateY(7px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        spin_slow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        pulse_dot: "pulse_dot 2s ease-in-out infinite",
        reveal: "reveal 0.25s ease-out",
        flash: "flash 1.2s ease-out",
        rise: "rise 0.6s cubic-bezier(0.16,1,0.3,1) both",
        rise_sm: "rise_sm 0.7s cubic-bezier(0.16,1,0.3,1) both",
        spin_slow: "spin_slow 5s linear infinite",
      },
    },
  },
  plugins: [],
};
