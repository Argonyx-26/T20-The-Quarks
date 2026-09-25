/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      colors: {
        // Soft-light architectural palette: mist/stone surfaces, ink typography.
        // Never pure white -- see base-500, the lightest tier, still #F8F9F9.
        base: {
          900: "#DEE3E6", // deepest inset tone
          800: "#EEF1F3", // page background
          700: "#F4F6F7", // panel surface
          600: "#E7EBEC", // nested / hover surface
          500: "#F8F9F9", // raised / near-white surface, used sparingly
        },
        line: {
          DEFAULT: "rgba(22,30,38,0.14)",
          soft: "rgba(22,30,38,0.08)",
          strong: "rgba(22,30,38,0.28)",
        },
        ink: {
          DEFAULT: "#151A20",
          muted: "#55606B",
          faint: "#8991A0",
        },
        amber: {
          DEFAULT: "#B9842D",
          soft: "#9C6D22",
        },
        status: {
          ok: "#3D9270",
          warn: "#B9842D",
          critical: "#CB514F",
          offline: "#A1A8AF",
        },
        source: {
          vision: "#4779D8",
          endpoint: "#805EC7",
          network: "#2A9698",
        },
      },
      boxShadow: {
        none: "none",
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
