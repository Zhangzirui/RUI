const path = require('path');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const common = require('./webpack.common');
const resolve = (filePath) => path.resolve(__dirname, filePath);
const includePath = resolve('../src');
const excludePath = resolve('../node_modules');
const isPrd = process.env.NODE_ENV === 'production';

module.exports = merge(common, {
    mode: isPrd ? 'production' : 'development',
    entry: {
        test: '../demo/test.js'
    },
    output: {
        path: resolve('../dist'),
        filename: isPrd ? '[name].[chunkhash:8].js' : '[name].js'
    },
    devServer: {
        contentBase: './dist',
        port: 8080,
        index: 'test.html',
        hot: true
    },
    module: {
        rules: [
            {
                test: /\.scss$/,
                include: includePath,
                exclude: excludePath,
                use: [
                    isPrd ? MiniCssExtractPlugin.loader : 'style-loader',
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins: [
                                require('autoprefixer')
                            ]
                        }
                    },
                    'sass-loader'
                ]
            },
            {
                test: /\.css$/,
                include: includePath,
                exclude: excludePath,
                use: [
                    isPrd ? MiniCssExtractPlugin.loader : 'style-loader',
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins: [
                                require('autoprefixer')
                            ]
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            filename: 'test.html',
            template: '../index.html',
            chunks: ['test'] // 对应着 entry
        }),
        new MiniCssExtractPlugin({
            filename: isPrd ? '[name].[chunkhash:8].css' : '[name].css'
        })
    ]
});
