import analyze from 'rollup-plugin-analyzer';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import svg from 'rollup-plugin-svg';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default [
  {
    input: ['src/GraphiQLTree.tsx'],
    external: ['react'],
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        exports: 'named',
      },
      {
        file: 'dist/index.es.js',
        format: 'esm',
        exports: 'named',
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve(),
      commonjs(),
      typescript(),
      postcss({
        extract: true,
        modules: true,
        use: ['sass'],
      }),
      json(),
      svg(),
      babel({ babelHelpers: 'bundled' }),
      analyze(),
    ],
  },
];
