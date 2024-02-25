const path = require("path")
const HtmlWebpack = require("html-webpack-plugin")

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
    pickstest: {
      import: "./src/scripts/pickstest.js",
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
      title: "Picks Test",
      filename: "pickstest.html",
      template: "./src/pickstest.html",
      chunks: ["shared", "pickstest"]
    }),
    new HtmlWebpack({
      title: "Scoreboard",
      filename: "scoreboard.html",
      template: "./src/scoreboard.html",
      chunks: ["shared", "scoreboard"]
    }),
  ]
}
