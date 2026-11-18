import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: { environment: 'node', include: ['packages/kit/tests/**/*.test.ts'] },
})
