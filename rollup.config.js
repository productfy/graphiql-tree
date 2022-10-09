import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
// eslint-disable-next-line import/no-anonymous-default-export
export default {
  input: 'src/GraphiQLWithTree.tsx',
  output: {
    file: '/dist/GraphiQLWithTree.js',
    format: 'cjs'
  },
  plugins: [nodeResolve(), commonjs]
};
