// import analyze from 'rollup-plugin-analyzer';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import resolve from '@rollup/plugin-node-resolve';
import svg from 'rollup-plugin-svg';
import typescript from 'rollup-plugin-typescript2';

const plugins = [
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
  // analyze(),
];

export default [
  {
    input: ['src/build.ts'],
    output: [
      {
        exports: 'named',
        file: 'dist/build.js',
        format: 'cjs',
      },
      {
        exports: 'named',
        file: 'dist/build.es.js',
        format: 'esm',
      },
    ],
    plugins,
  },
  // {
  //   input: ['src/GraphiQLWithTree.tsx'],
  //   output: [
  //     {
  //       exports: 'named',
  //       file: 'dist/GraphiQLWithTree.js',
  //       format: 'cjs',
  //     },
  //     {
  //       exports: 'named',
  //       file: 'dist/GraphiQLWithTree.es.js',
  //       format: 'esm',
  //     },
  //   ],
  //   plugins,
  // },
];
