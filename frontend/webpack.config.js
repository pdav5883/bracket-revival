const path = require("path")

module.exports = {
  entry: {
    brackettest: {
      import: "./scripts/brackettest.js",
      dependOn: "shared"
    },
    bracket: {
      import: "./scripts/bracket.js",
      dependOn: "shared"
    },
    shared: "./scripts/shared.js"
  },
  mode: "development",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js"
  },
}
