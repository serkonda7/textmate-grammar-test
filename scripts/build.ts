import { type BuildConfig, build } from 'bun'

type BuildMode = '--dev' | '--prod'

const mode = (process.argv[2] as BuildMode) ?? '--prod'
const is_dev = mode === '--dev'

const base_cfg: BuildConfig = {
	entrypoints: ['src/unit.ts', 'src/snapshot.ts'],
	outdir: 'dist',
	target: 'node',
	splitting: true,
	packages: 'external',
}

const dev_cfg: BuildConfig = {
	...base_cfg,
	sourcemap: 'inline',
}

const prod_cfg: BuildConfig = {
	...base_cfg,
	minify: true,
}

await build(is_dev ? dev_cfg : prod_cfg)
