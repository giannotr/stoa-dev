import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const kitSrc = path.resolve(dirname, '../../packages/kit/src')

// Stories run against the kit's sources, not its build: edits show up instantly
// and the interaction tests check exactly what the next release will contain.
const kitEntries = [
	'ui',
	'shell',
	'display',
	'licensing',
	'autosave',
	'hooks',
	'utils',
	'i18n',
]

export default defineConfig({
	plugins: [react(), tailwindcss()],
	// Same convention as the kit build: SCSS modules are read as `styles.pageHeading`.
	css: { modules: { localsConvention: 'camelCaseOnly' } },
	resolve: {
		alias: kitEntries.map((entry) => ({
			find: `@stoa-dev/kit/${entry}`,
			replacement: path.join(kitSrc, entry, 'index.ts'),
		})),
	},
	test: {
		projects: [
			{
				extends: true,
				plugins: [
					storybookTest({ configDir: path.join(dirname, '.storybook') }),
				],
				test: {
					name: 'storybook',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
	},
})
