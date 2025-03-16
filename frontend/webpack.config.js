const path = require("path")
const HtmlWebpack = require("html-webpack-plugin")
const CopyWebpack = require("copy-webpack-plugin")
const { execSync } = require('child_process')

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
      dependOn: "shared"
    },
    bracket: {
      import: "./src/scripts/bracket.js",
      dependOn: "shared"
    },
    picks: {
      import: "./src/scripts/picks.js",
      dependOn: "shared"
    },
    scoreboard: {
      import: "./src/scripts/scoreboard.js",
      dependOn: "shared"
    },
    join: {
      import: "./src/scripts/join.js",
      dependOn: "shared"
    },
    index: {
      import: "./src/scripts/index.js",
      dependOn: "shared"
    },
    navonly: {
      import: "./src/scripts/navonly.js",
      dependOn: "shared"
    },
    login: {
      import: "./src/scripts/login.js",
      dependOn: "shared"
    },
    shared: "./src/scripts/shared.js"
  },
  mode: "development",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "scripts/[name].bundle.js"
  },
  plugins: [
    new HtmlWebpack({
      title: "Admin",
      filename: "admin.html",
      template: "./src/admin.html",
      chunks: ["shared", "admin"]
    }),
    new HtmlWebpack({
      title: "About",
      filename: "about.html",
      template: "./src/about.html",
      chunks: ["shared", "navonly"]
    }),
    new HtmlWebpack({
      title: "Bracket",
      filename: "bracket.html",
      template: "./src/bracket.html",
      chunks: ["shared", "bracket"]
    }),
    new HtmlWebpack({
      title: "Picks",
      filename: "picks.html",
      template: "./src/picks.html",
      chunks: ["shared", "picks"]
    }),
    new HtmlWebpack({
      title: "Scoreboard",
      filename: "scoreboard.html",
      template: "./src/scoreboard.html",
      chunks: ["shared", "scoreboard"]
    }),
    new HtmlWebpack({
      title: "Join Game",
      filename: "join.html",
      template: "./src/join.html",
      chunks: ["shared", "join"]
    }),
    new HtmlWebpack({
      title: "Rules",
      filename: "rules.html",
      template: "./src/rules.html",
      chunks: ["shared", "navonly"]
    }),
    new HtmlWebpack({
      title: "Bracket Revival",
      filename: "index.html",
      template: "./src/index.html",
      chunks: ["shared", "index"]
    }),
    new HtmlWebpack({
      title: "Login",
      filename: "login.html",
      template: "./src/login.html",
      chunks: ["shared", "login"]
    }),
    new CopyWebpack({
      patterns: [
        {
          from: "./src/nav.html",
          to: "assets",
        },
        {
          from: "./src/images",
          to: "assets",
        },
      ]
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.js$/,
        use: [{
          loader: 'string-replace-loader',
          options: {
            multiple: Object.entries(cfParams).map(([key, value]) => ({
              search: key,
              replace: value,
              flags: 'g'
            }))
          }
        }]
      }
    ]
  },
  devtool: 'source-map'
}
