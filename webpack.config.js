module.exports = {
    mode: process.env.NODE_ENV || "development",
    devtool : 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            [
                                "@babel/preset-env",
                                {
                                    targets: {
                                        node: true
                                    }
                                },
                            ],
                            "@babel/preset-react",
                        ],
                    },
                }
            },
            {
                test: /\.css/,
                use: [
                    "style-loader",
                    "css-loader",
                ],
            },
        ]
    },
    resolve: {
        extensions: [".jsx", ".js"]
    },
};
