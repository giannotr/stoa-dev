import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
	addons: ['@storybook/addon-docs', '@storybook/addon-vitest'],
	framework: '@storybook/react-vite',
	// Placeholder assets for stories, e.g. the logo used by StartupAnimation.
	staticDirs: ['../public'],
	core: { disableTelemetry: true },
}

export default config
