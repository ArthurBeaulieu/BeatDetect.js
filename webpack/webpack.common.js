const path = require('path');
const webpack = require('webpack');
const loaders = require('./loaders');
const plugins = require('./plugins');

module.exports = {
  entry: ['./src/BeatDetect.js'],
  module: {
    rules: [
      loaders.JSLoader
    ]
  },
  output: {
    filename: 'BeatDetect.bundle.js',
    path: path.resolve(__dirname, '../dist'),
    library: 'BeatDetect', // We set a library name to bundle the export default of the class
    libraryTarget: 'window', // Make it globally available
    libraryExport: 'default' // Make BeatDetect.default become BeatDetect
  },
  plugins: [
    new webpack.ProgressPlugin(),
    plugins.CleanWebpackPlugin,
    plugins.ESLintPlugin
  ]
};
