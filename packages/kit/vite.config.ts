import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(
	readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
)
const peers = Object.keys(pkg.peerDependencies ?? {})
// Keep every peer (and its subpaths, e.g. `react/jsx-runtime`) out of the bundle.
const external = (id: string) =>
	peers.some((peer) => id === peer || id.startsWith(`${peer}/`))

const entries = ['ui', 'shell', 'licensing', 'hooks', 'utils', 'i18n']

export default defineConfig({
	plugins: [react()],
	css: {
		modules: {
			// Stable, readable, collision-safe class names: stoa-AppNavigation-menuButton-x1y2
			generateScopedName: (local, file) => {
				const component = file
					.split('/')
					.at(-1)
					?.replace(/\.module\.s?css.*$/, '')
				let hash = 0
				for (const char of `${file}:${local}`)
					hash = (hash * 31 + char.charCodeAt(0)) >>> 0
				return `stoa-${component}-${local}-${hash.toString(36).slice(0, 4)}`
			},
			localsConvention: 'camelCaseOnly',
		},
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		sourcemap: true,
		cssCodeSplit: false,
		lib: {
			entry: Object.fromEntries(
				entries.map((e) => [`${e}/index`, `src/${e}/index.ts`]),
			),
			formats: ['es'],
			cssFileName: 'kit',
		},
		rollupOptions: {
			external,
			output: {
				preserveModules: true,
				preserveModulesRoot: 'src',
				entryFileNames: '[name].js',
			},
		},
	},
})
