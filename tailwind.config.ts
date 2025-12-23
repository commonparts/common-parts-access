import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
          link: "var(--color-text-link)",
        },

        bg: {
          page: "var(--color-background-page)",
          surface: "var(--color-background-surface)",
          subtle: "var(--color-background-subtle)",
          hover: "var(--color-background-hover)",
          disabled: "var(--color-background-disabled)",
        },

        border: {
          DEFAULT: "var(--color-border-default)",
          subtle: "var(--color-border-subtle)",
          strong: "var(--color-border-strong)",
          focus: "var(--color-border-focus)",
        },

        action: {
          primary: "var(--color-action-primary)",
          primaryHover: "var(--color-action-primaryHover)",
          primaryActive: "var(--color-action-primaryActive)",
          disabled: "var(--color-action-disabled)",
        },

        status: {
          success: "var(--color-status-success)",
          successText: "var(--color-status-successText)",
        },
      },

      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
      },

      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        lg: "var(--radius-lg)",
        full: "var(--radius-pill)",
      },

      boxShadow: {
        none: "var(--elevation-none)",
        surface: "var(--elevation-surface)",
        raised: "var(--elevation-raised)",
        overlay: "var(--elevation-overlay)",
        modal: "var(--elevation-modal)",
      },

      transitionDuration: {
        fast: "var(--motion-duration-fast)",
        medium: "var(--motion-duration-medium)",
        slow: "var(--motion-duration-slow)",
      },

      transitionTimingFunction: {
        standard: "var(--motion-easing-standard)",
        in: "var(--motion-easing-in)",
        out: "var(--motion-easing-out)",
      },

      fontFamily: {
        body: "var(--font-body)",
        heading: "var(--font-heading)",
        mono: "var(--font-mono)",
      },
    },
  },

  plugins: [],
}

export default config;
