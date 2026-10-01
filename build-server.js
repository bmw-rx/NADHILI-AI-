import esbuild from 'esbuild';

try {
  esbuild.buildSync({
    entryPoints: ['server.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: 'dist/server.js',
  });
  console.log('✅ Server bundle generated at dist/server.js');
} catch (err) {
  console.error('Failed to bundle server.ts:', err);
  process.exit(1);
}
