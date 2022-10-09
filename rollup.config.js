import css from 'rollup-plugin-css-only'
// eslint-disable-next-line import/no-anonymous-default-export
export default {
  entry: 'dist/GraphiQLWithTree.es.js',
  dest: {
    file: '/dist/bundle.js',
  },
  plugins: [css({output: 'bundle.css'})]
};
