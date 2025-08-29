const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popup/popup-react.jsx',
    content: './src/content/content.js',
    background: './src/background/background.js',
    'pii-detector': './src/detection/pii-detector.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup/popup-template.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: 'manifest.json',
          transform(content) {
            const manifest = JSON.parse(content);
            // Update paths for built files
            manifest.action.default_popup = 'popup.html';
            manifest.background.service_worker = 'background.js';
            manifest.content_scripts[0].js = ['pii-detector.js', 'content.js'];
            return JSON.stringify(manifest, null, 2);
          }
        },
        { from: 'logo.png', to: 'logo.png' }
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};