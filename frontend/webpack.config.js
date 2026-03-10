const path = require("path")
const HtmlWebpack = require("html-webpack-plugin")
const CopyWebpack = require("copy-webpack-plugin")
const { execSync } = require('child_process')

const isProduction = process.env.NODE_ENV === "production"

// Get CloudFormation parameters
const cfParams = Object.fromEntries(
  execSync('bash get-cf-params.sh', { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .map(line => {
      const [key, value] = line.split('=')
      return [key, JSON.stringify(value.trim())]
    })
)

module.exports = {
  entry: {
    admin: {
      import: "./src/scripts/admin.js",
    },
    bracket: {
      import: "./src/scripts/bracket.js",
    },
    picks: {
      import: "./src/scripts/picks.js",
    },
    scoreboard: {
      import: "./src/scripts/scoreboard.js",
    },
    join: {
      import: "./src/scripts/join.js",
    },
    index: {
      import: "./src/scripts/index.js"
    },
    demo: {
      import: "./src/scripts/demo.js",
    },
    navonly: {
      import: "./src/scripts/navonly.js",
    },
    login: {
      import: require.resolve("blr-shared-frontend/dist/login.js"),
    },
    ...(isProduction ? {} : { "tests/testing": { import: "./tests/testing.js" } }),
  },
  mode: isProduction ? "production" : "development",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "scripts/[name].bundle.js",
  },
  plugins: [
    new HtmlWebpack({
      title: "Admin",
      filename: "admin.html",
      template: "./src/admin.html",
      chunks: ["admin"],
    }),
    new HtmlWebpack({
      title: "About",
      filename: "about.html",
      template: "./src/about.html",
      chunks: ["navonly"],
    }),
    new HtmlWebpack({
      title: "Bracket",
      filename: "bracket.html",
      template: "./src/bracket.html",
      chunks: ["bracket"],
    }),
    new HtmlWebpack({
      title: "Demo",
      filename: "demo.html",
      template: "./src/demo.html",
      chunks: ["demo"],
    }),
    new HtmlWebpack({
      title: "Login",
      filename: "login.html",
      template: require.resolve("blr-shared-frontend/src/login.html"),
      chunks: ["navonly", "login"],
      inject: true,
    }),
    new HtmlWebpack({
      title: "Picks",
      filename: "picks.html",
      template: "./src/picks.html",
      chunks: ["picks"],
    }),
    new HtmlWebpack({
      title: "Scoreboard",
      filename: "scoreboard.html",
      template: "./src/scoreboard.html",
      chunks: ["scoreboard"],
    }),
    new HtmlWebpack({
      title: "Join Game",
      filename: "join.html",
      template: "./src/join.html",
      chunks: ["join"],
    }),
    new HtmlWebpack({
      title: "Rules",
      filename: "rules.html",
      template: "./src/rules.html",
      chunks: ["navonly"],
    }),
    new HtmlWebpack({
      title: "Bracket Revival",
      filename: "index.html",
      template: "./src/index.html",
      chunks: ["index"],
    }),
    ...(isProduction ? [] : [
      new HtmlWebpack({
        title: "Testing",
        filename: "tests/testing.html",
        template: "./tests/testing.html",
        chunks: ["tests/testing"],
      }),
    ]),
    new CopyWebpack({
      patterns: [
        {
          from: "./src/images",
          to: "assets",
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: "string-replace-loader",
            options: {
              multiple: Object.entries(cfParams).map(([key, value]) => ({
                search: key,
                replace: value,
                flags: "g",
              })),
            },
          },
        ],
      },
    ],
  },
  devtool: "source-map",

  optimization: {
    splitChunks: {
      chunks: "all",
    },
  }
};
