module.exports = config => {
  config.set({
    basePath: '../',
    singleRun: !config.dev, // Keep browser open in dev mode
    browsers: ['Firefox'], // TODO optionnaly launch browsers
    frameworks: ['jasmine'],
    client: {
      jasmine: {
        random: !config.dev // Randomly run test when not developping them
      }
    },
    files: [
      'test/testContext.js',
      {
        pattern: 'demo/audio/*.mp3',
        included: false,
        served: true,
        nocache: false
      }
    ],
    reporters: ['progress', 'coverage'],
    preprocessors: {
      'test/testContext.js': ['webpack', 'coverage']
    },
    coverageReporter: {
      type : 'lcov',
      dir : 'test/coverage/',
      // file : 'coverage.json',
      subdir: browser => {
        return browser.toLowerCase().split(/[ /-]/)[0];
      }
    },
    babelPreprocessor: {
      options: {
        presets: ['env'],
        sourceMap: false
      }
    },
    webpack: {
      devtool: false,
      module: {
        rules: [{
          test: /\.js/,
          exclude: /node_modules/,
          use: [{
            loader: 'babel-loader'
          }]
        }]
      },
      watch: true,
      mode: 'development'
    },
    webpackServer: {
      noInfo: true
    }
  });
};
