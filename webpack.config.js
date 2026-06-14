const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'drawflow-plus.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'DrawflowPlus',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this'
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      '@extensions': path.resolve(__dirname, 'src/extensions/'),
      '@utils': path.resolve(__dirname, 'src/utils/')
    }
  },
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  optimization: {
    minimize: process.env.NODE_ENV === 'production'
  }
};
