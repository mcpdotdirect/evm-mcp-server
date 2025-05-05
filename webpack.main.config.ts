import type { Configuration } from 'webpack';
import path from 'path';

const config: Configuration = {
  entry: './src/electron/index.ts',
  target: 'electron-main',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'build/electron'),
    filename: 'main.js',
  },
};

export default config; 