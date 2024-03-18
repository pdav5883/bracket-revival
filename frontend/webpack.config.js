const path = require("path")
const HtmlWebpack = require("html-webpack-plugin")
const CopyWebpack = require("copy-webpack-plugin")

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
    newplayer: {
      import: "./src/scripts/newplayer.js",
      dependOn: "shared"
    },
    index: {
      import: "./src/scripts/index.js",
      dependOn: "shared"
    },
    rules: {
      import: "./src/scripts/rules.js",
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
      title: "New Player",
      filename: "newplayer.html",
      template: "./src/newplayer.html",
      chunks: ["shared", "newplayer"]
    }),
    new HtmlWebpack({
      title: "Rules",
      filename: "rules.html",
      template: "./src/rules.html",
      chunks: ["shared", "rules"]
    }),
    new HtmlWebpack({
      title: "Bracket Revival",
      filename: "index.html",
      template: "./src/index.html",
      chunks: ["shared", "index"]
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
    ]
  }
}
