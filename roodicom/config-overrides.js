// config-overrides.js
const webpack = require('webpack');

module.exports = function override(config) {
    config.resolve.fallback = {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        assert: require.resolve('assert'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        url: require.resolve('url'),
        buffer: require.resolve('buffer'),
        util: require.resolve('util'),
        process: require.resolve('process/browser.js'), // explicitly add '.js'
        zlib: require.resolve('browserify-zlib'),
        path: require.resolve('path-browserify'),
        fs: false,
    };

    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: 'process/browser.js', // explicitly '.js'
            Buffer: ['buffer', 'Buffer'],
        }),
    ]);

    // Add this rule to handle fully specified modules (.mjs files)
    config.module.rules.push({
        test: /\.m?js/,
        resolve: {
            fullySpecified: false,
        },
    });

    return config;
};
