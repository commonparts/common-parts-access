import type { Config } from "tailwindcss";

/**
 * Design token → Tailwind mapping
 *
 * All values reference CSS custom properties injected by themeToCSSVars()
 * on <body>. This means themes switch at runtime by swapping the vars,
 * no rebuild needed.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      /* ── Colors ── */
      colors: {
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
          link: "var(--color-text-link)",
          linkHover: "var(--color-text-linkHover)",
        },
        bg: {
          page: "var(--color-background-page)",
          surface: "var(--color-background-surface)",
          subtle: "var(--color-background-subtle)",
          muted: "var(--color-background-muted)",
          hover: "var(--color-background-hover)",
          disabled: "var(--color-background-disabled)",
          accent: "var(--color-background-accent)",
          accentSubtle: "var(--color-background-accentSubtle)",
        },
        border: {
          DEFAULT: "var(--color-border-default)",
          default: "var(--color-border-default)",
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
        institutional: {
          viridian: "var(--color-institutional-viridian)",
          malachite: "var(--color-institutional-malachite)",
        },
        status: {
          success: "var(--color-status-success)",
          successText: "var(--color-status-successText)",
          error: "var(--color-status-error)",
          errorText: "var(--color-status-errorText)",
          errorBorder: "var(--color-status-errorBorder)",
          warning: "var(--color-status-warning)",
          warningText: "var(--color-status-warningText)",
          warningBorder: "var(--color-status-warningBorder)",
        },
        certification: {
          bg: "var(--color-certification-background)",
          text: "var(--color-certification-text)",
          outlineBorder: "var(--color-certification-outlineBorder)",
          outlineText: "var(--color-certification-outlineText)",
        },
      },

      /* ── Spacing ── */
      spacing: {
        "3xs": "var(--spacing-3xs)", // 4px
        "2xs": "var(--spacing-2xs)", // 8px
        xs: "var(--spacing-xs)", // 12px
        sm: "var(--spacing-sm)", // 16px
        md: "var(--spacing-md)", // 24px
        lg: "var(--spacing-lg)", // 32px
        xl: "var(--spacing-xl)", // 48px
        "2xl": "var(--spacing-2xl)", // 64px
        "3xl": "var(--spacing-3xl)", // 80px
        "4xl": "var(--spacing-4xl)", // 96px
        "5xl": "var(--spacing-5xl)", // 120px
      },

      /* ── Border radius ── */
      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)", // 4px
        md: "var(--radius-md)", // 6px
        lg: "var(--radius-lg)", // 8px
        xl: "var(--radius-xl)", // 12px
        pill: "var(--radius-pill)",
      },

      /* ── Box shadow (elevation) ── */
      boxShadow: {
        none: "var(--elevation-none)",
        surface: "var(--elevation-surface)",
        raised: "var(--elevation-raised)",
        overlay: "var(--elevation-overlay)",
        modal: "var(--elevation-modal)",
      },

      /* ── Typography ── */
      fontFamily: {
        body: "var(--typography-font-body)",
        heading: "var(--typography-font-heading)",
        mono: "var(--typography-font-mono)",
      },

      fontSize: {
        micro: "var(--typography-size-micro)", // 11px
        caption: "var(--typography-size-caption)", // 13px
        body: "var(--typography-size-body)", // 14px
        bodyLg: "var(--typography-size-bodyLg)", // 15px
        subtitle: "var(--typography-size-subtitle)", // 17px
        "heading-sm": "var(--typography-size-headingSm)", // 22px
        "heading-md": "var(--typography-size-headingMd)", // 28px
        "heading-lg": "var(--typography-size-headingLg)", // 32px
        display: "var(--typography-size-display)", // 42px
        "display-lg": "var(--typography-size-displayLg)", // 48px
      },

      fontWeight: {
        light: "var(--typography-weight-light)", // 300
        regular: "var(--typography-weight-regular)", // 400
        medium: "var(--typography-weight-medium)", // 500
        semibold: "var(--typography-weight-semibold)", // 600
      },

      lineHeight: {
        tight: "var(--typography-lineHeight-tight)", // 1.15
        snug: "var(--typography-lineHeight-snug)", // 1.3
        normal: "var(--typography-lineHeight-normal)", // 1.5
        relaxed: "var(--typography-lineHeight-relaxed)", // 1.65
      },

      letterSpacing: {
        tight: "var(--typography-letterSpacing-tight)", // -0.02em
        snug: "var(--typography-letterSpacing-snug)", // -0.01em
        normal: "var(--typography-letterSpacing-normal)", // 0
        wide: "var(--typography-letterSpacing-wide)", // 0.01em
        mono: "var(--typography-letterSpacing-mono)", // 0.08em
        caps: "var(--typography-letterSpacing-caps)", // 0.1em
      },

      /* ── Motion ── */
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

      /* ── Layout ── */
      maxWidth: {
        "container-sm": "480px",
        "container-md": "680px",
        "container-lg": "1100px",
        "container-xl": "1200px",
      },
    },
  },
  plugins: [],
};

export default config;