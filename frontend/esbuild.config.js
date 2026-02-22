import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const production = process.env.NODE_ENV === 'production';
const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/apt.tsx'],
  bundle: true,
  outdir: 'dist',
  entryNames: '[name]',
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: !production,
  minify: production,

  // External dependencies (provided by Cockpit)
  external: ['cockpit'],

  // Handle JSX
  jsx: 'automatic',

  // Handle CSS
  loader: {
    '.css': 'css',
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.eot': 'file',
  },

  // Asset names
  assetNames: '[name]',

  plugins: [
    {
      name: 'copy-assets',
      setup(build) {
        build.onEnd(() => {
          // Ensure dist directory exists
          if (!fs.existsSync('dist')) {
            fs.mkdirSync('dist', { recursive: true });
          }

          // Copy static files
          const filesToCopy = [
            { from: 'src/index.html', to: 'dist/index.html' },
            { from: 'src/manifest.json', to: 'dist/manifest.json' },
          ];

          for (const { from, to } of filesToCopy) {
            if (fs.existsSync(from)) {
              fs.copyFileSync(from, to);
              console.log(`Copied: ${from} → ${to}`);
            }
          }

          console.log('Build complete!');
        });
      },
    },
  ],
};

// Run build
if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(config);
}
