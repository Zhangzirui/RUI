const path = require('path');
const resolve = (filePath) => path.resolve(__dirname, filePath);
const includePath = resolve('../src');
const excludePath = resolve('../node_modules');

module.exports = {
    context: __dirname,
    resolve: {
        extensions: ['.js', '.jsx', 'scss'],
        alias: {
            '$pages': resolve('../src/pages'),
            '$route': resolve('../src/route'),
            '$util': resolve('../src/util'),
            '$common': resolve('../src/common')
        }
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                // include: includePath,
                exclude: excludePath,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                '@babel/react',
                                '@babel/env'
                            ],
                            plugins: [
                                ['@babel/plugin-proposal-decorators', {'legacy': true}],
                                ['@babel/plugin-proposal-class-properties', {'loose' : true}]
                            ]
                        }
                    }
                ]
            }
        ]
    }
};