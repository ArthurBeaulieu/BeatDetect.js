module.exports = env => {
  // Webpack clean and uglify plugins
  const path = require('path');
  const { CleanWebpackPlugin } = require('clean-webpack-plugin');
  // Utils path
  const SRC = path.resolve(__dirname, '');
  const DIST = path.resolve(__dirname, 'dist');
  // Webpack configuration object
  return {
    mode: env.dev === 'true' ? 'development' : 'production',
    watch: env.dev === 'true',
    entry: ['src/BeatDetect.js'],
    stats: {
      warnings: env.dev === 'true',
    },
    devtool: false,
    output: {
      path: DIST,
      filename: `BeatDetect.min.js`
    },
    module: { // Only transpile code in production mode
      rules: env.dev === 'true' ? [] : [{
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }]
    },
    plugins: [
      new CleanWebpackPlugin({
        root: DIST,
        verbose: true,
        dry: false
      })
    ],
    resolve: {
      extensions: ['.js'],
      modules: ['node_modules', SRC]
    }
  };
};
