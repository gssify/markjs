const baseConfig = require('./webpack.base')
const mergeConfig = require('webpack-merge')
const path = require('path')
const webpack = require('webpack')

module.exports = mergeConfig(baseConfig, {
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  output: {
    path: path.resolve(__dirname, '../docs'),
    filename: 'mark.js',
    library: 'Mark',
    libraryTarget: 'umd'
  },
  devServer: {
    contentBase: path.resolve(__dirname, '../docs'),
    port: 3000,
    hot: true
  }
})
