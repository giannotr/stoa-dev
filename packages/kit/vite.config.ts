import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(
	readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
)
const peers = Object.keys(pkg.peerDependencies ?? {})
// Keep every peer (and its subpaths, e.g. `react/jsx-runtime`) out of the bundle.
const external = (id: string) =>
	peers.some((peer) => id === peer || id.startsWith(`${peer}/`))

const srcDir = fileURLToPath(new URL('./src', import.meta.url))

const entries = [
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
	plugins: [react()],
	css: {
		modules: {
			// Stable, readable, collision-safe class names: stoa-AppNavigation-menuButton-x1y2
			generateScopedName: (local, file) => {
				// Hash the path relative to src/, never the absolute one: class names must not
				// change when the package is built on another machine or in another folder.
				const relative = path
					.relative(srcDir, file.replace(/\?.*$/, ''))
					.split(path.sep)
					.join('/')
				const component = relative
					.split('/')
					.at(-1)
					?.replace(/\.module\.s?css$/, '')
				let hash = 0
				for (const char of `${relative}:${local}`)
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
