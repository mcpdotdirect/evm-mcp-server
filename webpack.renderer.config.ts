import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
}; 