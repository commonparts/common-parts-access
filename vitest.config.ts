import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'supabase/**', '.next/**'],
    coverage: {
      provider: 'v8',
      include: ['app/**', 'components/**', 'lib/**', 'hooks/**'],
      exclude: [
        'supabase/**',
        'node_modules/**',
        '.next/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.config.{ts,js,mjs}',
        '**/types/**',
        'design-tokens/**',
      ],
      // Start at 0 — raise these thresholds as tests are added.
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // `server-only` throws on import unless resolved under the `react-server`
      // condition, which Vitest does not use. Point it at the package's own
      // empty module, the file Next.js resolves for server code, so tests can
      // import server modules such as lib/supabase/admin.ts.
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
})
