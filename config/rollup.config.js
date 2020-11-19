import analyze from 'rollup-plugin-analyzer';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import pkg from '../package.json';
import postcss from 'rollup-plugin-postcss';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default [
  // {
  //   input: ['src/GraphiQLWithTree.tsx'],
  //   external: ['react'],
  //   preserveModules: true,
  //   output: [
  //     {
  //       dir: 'dist',
  //       format: 'cjs',
  //       exports: 'named',
  //     },
  //   ],
  //   plugins: [
  //     peerDepsExternal(),
  //     resolve(),
  //     commonjs(),
  //     typescript(),
  //     postcss({
  //       extract: false,
  //       modules: true,
  //       use: ['sass'],
  //     }),
  //     json(),
  //     babel({ babelHelpers: 'bundled' }),
  //     analyze(),
  //   ],
  // },
  // {
  //   input: ['src/GraphiQLWithTree.tsx'],
  //   external: ['react'],
  //   preserveModules: true,
  //   output: [
  //     {
  //       dir: 'dist',
  //       format: 'esm',
  //       exports: 'named',
  //     },
  //   ],
  //   plugins: [
  //     peerDepsExternal(),
  //     resolve(),
  //     commonjs(),
  //     typescript(),
  //     postcss({
  //       extract: false,
  //       modules: true,
  //       use: ['sass'],
  //     }),
  //     json(),
  //     babel({ babelHelpers: 'bundled' }),
  //     analyze(),
  //   ],
  // },
  {
    input: ['src/GraphiQLWithTree.tsx'],
    external: ['react'],
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        exports: 'named',
      },
      {
        file: pkg.module,
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
        extract: false,
        modules: true,
        use: ['sass'],
      }),
      json(),
      babel({ babelHelpers: 'bundled' }),
      analyze(),
    ],
  },
];
