import analyze from 'rollup-plugin-analyzer';
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
  analyze(),
];

export default [
  {
    external: ['graphql', 'lodash', 'react'],
    input: ['src/GraphiQLTree.tsx'],
    output: [
      {
        exports: 'named',
        file: 'dist/index.js',
        format: 'cjs',
      },
      {
        exports: 'named',
        file: 'dist/index.es.js',
        format: 'esm',
      },
    ],
    plugins,
  },
  {
    external: ['graphql', 'lodash', 'react'],
    input: ['src/GraphiQLWithTree.tsx'],
    output: [
      {
        exports: 'named',
        file: 'dist/GraphiQLWithTree.js',
        format: 'cjs',
      },
      {
        exports: 'named',
        file: 'dist/GraphiQLWithTree.es.js',
        format: 'esm',
      },
    ],
    plugins,
  },
];
