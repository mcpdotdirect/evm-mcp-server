export const rules = [
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
]; 