import type { Configuration } from 'webpack';
import path from 'path';

export const rendererConfig: Configuration = {
  entry: './src/renderer/renderer.ts',
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.css'],
  },
  output: {
    path: path.resolve(__dirname, 'build/renderer'),
    filename: 'renderer.js',
  },
}; 