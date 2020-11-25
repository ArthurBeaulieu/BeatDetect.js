'use strict';

const path = require('path');
const _ESLintPlugin = require('eslint-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const ESLintPlugin = new _ESLintPlugin({
  overrideConfigFile: path.resolve(__dirname, '.eslintrc'),
  context: path.resolve(__dirname, '../src/'),
  files: '**/*.js'
});

module.exports = {
  CleanWebpackPlugin: new CleanWebpackPlugin(),
  ESLintPlugin: ESLintPlugin
};
