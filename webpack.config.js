const path = require('path');

module.exports = {
  entry: './src/index.js',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'ispeak-widget.min.js',
    library: 'iSpeakWidget',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }
    ]
  },
  
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
