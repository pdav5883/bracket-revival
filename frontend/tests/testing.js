import { buildGamesNested, calcPointsRevival } from "../src/scripts/demo.js"

const functions = { buildGamesNested, calcPointsRevival }

function print(name, value) {
  const str = typeof value === "string" ? value : JSON.stringify(value, null, 2)
  console.log(name + ":", value)
  const el = document.getElementById("output")
  if (el) el.textContent += name + ":\n" + str + "\n\n"
}

function parseArg(t) {
  const trimmed = t.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed.slice(1, -1).split(",").map((s) => parseArg(s)).filter((x) => x !== null)
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1)
  }
  const n = Number(trimmed)
  return !isNaN(n) ? n : trimmed
}

function parseArgs(argsParam) {
  if (!argsParam) return []
  return argsParam.split("|").map((s) => parseArg(s)).filter((x) => x !== null)
}

const params = new URLSearchParams(window.location.search)
const fnName = params.get("function")
const argsParam = params.get("args")

try {
  if (fnName) {
    const fn = functions[fnName]
    if (fn) {
      const args = parseArgs(argsParam)
      const result = fn(...args)
      const argsStr = args.map((a) => JSON.stringify(a)).join(", ")
      print(fnName + "(" + argsStr + ")", result)
    } else {
      print("error", "Unknown function: " + fnName + ". Available: " + Object.keys(functions).join(", "))
    }
  } else {
    print("error", "No function provided. Available: " + Object.keys(functions).join(", "))
  }
} catch (err) {
  print("error", err.message + (err.stack ? "\n" + err.stack : ""))
}
