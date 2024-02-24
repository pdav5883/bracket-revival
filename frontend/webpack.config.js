const path = require("path")
const HtmlWebpack = require("html-webpack-plugin")

module.exports = {
  entry: {
    brackettest: {
      import: "./src/scripts/brackettest.js",
      dependOn: "shared"
    },
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
    shared: "./src/scripts/shared.js"
  },
  mode: "development",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "scripts/[name].bundle.js"
  },
  plugins: [
    new HtmlWebpack({
      title: "Bracket Test",
      filename: "brackettest.html",
      template: "./src/brackettest.html",
      chunks: ["shared", "brackettest"]
    }),
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
  ]
}
