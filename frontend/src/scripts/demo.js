import { LOGO_URL } from "./constants.js"
import { initCommon } from "./shared.js"
import { Modal } from "blr-shared-frontend"
import { createBracket } from "bracketry"
import $ from "jquery"

export { buildGamesNested, calcPointsRevival }

// 7-game mini bracket: Sweet 16 (4), Elite 8 (2), Championship (1)
const DEMO_ROUND_NAMES = ["Elite 8", "Final 4", "Championship"]
const GAMES_PER_ROUND = [4, 2, 1]
const NUMGAMES = GAMES_PER_ROUND.reduce((a, b) => a + b, 0)
const PREV_GAME = [
  [null, null], [null, null], [null, null], [null, null],
  [0, 1], [2, 3],
  [4, 5]
]

const DEMO_DATA = {
  2024: {
    teams: [
      {name: "UConn", seed: "1", espn_id: "41"},
      {name: "Illinois", seed: "3", espn_id: "356"},
      {name: "Alabama", seed: "4", espn_id: "333"},
      {name: "Clemson", seed: "6", espn_id: "228"},
      {name: "Duke", seed: "4", espn_id: "150"},
      {name: "NC State", seed: "11", espn_id: "152"},
      {name: "Purdue", seed: "1", espn_id: "2509"},
      {name: "Tennessee", seed: "2", espn_id: "2633"}
    ],
    results: [0, 0, 1, 0, 0, 1, 0],
    scores: [[72, 64], [89, 82], [76, 84], [82, 75], [86, 72], [53, 58], [75, 60]],
  }
}

let bracket // variable is at module scope to enable pick actions to apply changes to bracket when picking
let matches // variable is needed for playerHtmlHelper to show results of previous picks, does not update with bracket
let picks = [] // variable is at module scope to allow adding/removing picks on event triggers

$(function () {
  initCommon()

  for (const yr of Object.keys(DEMO_DATA)) {
    const opt = document.createElement("option")
    opt.value = yr
    opt.textContent = yr
    $("#yearsel").append(opt)
  }

  $("#submitbutton").on("click", () => addPicks())
  $("#undobutton").on("click", () => removePicks())
  $("#resetbutton").on("click", () => resetBracket())
  $("#yearsel").on("change", () => resetBracket())

  resetBracket()
})

function resetBracket() {
  picks = []
  $("#statustext").text("")
  $("#resetbutton").hide()
  const year = $("#yearsel").val()
  if (!DEMO_DATA[year]) return
  renderBracket(year, picks)
}

/**
 * Converts bracket results 0/1/null into absolute team indices.
 * Builds the bracket bottom-up: first round pairs teams [0,1], [2,3], etc.; later rounds
 * are winners of previous games. Implicit assumption that all results in a round are either
 * all complete or all incomplete.
 */
function makeAbsoluteBracket(results) {
  const absInds = []
  for (let i = 0; i < NUMGAMES; i++) {
    const [prev0, prev1] = PREV_GAME[i]
    if (prev0 === null) {
      absInds.push([2 * i, 2 * i + 1])
    } else if (results[prev0] === null) {
      absInds.push([null, null])
    } else {
      const absUpper = absInds[prev0][results[prev0]]
      const absLower = absInds[prev1][results[prev1]]
      absInds.push([absUpper, absLower])
    }
  }
  return absInds
}

function buildGamesNested(year, picks) {
  const data = DEMO_DATA[year]

  const completedGames = GAMES_PER_ROUND.slice(0, picks.length).reduce((a, b) => a + b, 0)

  const results = data.results.map((r, i) => i < completedGames ? r : null)
  const scores = data.scores.map((s, i) => i < completedGames ? s : [null, null])

  const absInds = makeAbsoluteBracket(results)
  const points = calcPointsRevival(picks, results)
  const gamePicks = calcGamePicks(picks, results, data.teams.map(t => t.name))

  const games = []
  for (let i = 0; i < NUMGAMES; i++) {
    if (absInds[i][0] === null) {
      games.push({
        teams: [null, null],
        score: [null, null],
        result: null
      })
    } else {
      const [upper, lower] = absInds[i]
      games.push({
        teams: [data.teams[upper].name, data.teams[lower].name],
        seeds: [data.teams[upper].seed, data.teams[lower].seed],
        espn_ids: [data.teams[upper].espn_id, data.teams[lower].espn_id],
        score: scores[i],
        result: results[i],
        points: points[i],
        correct: points[i] === 0 ? 0 : 1 + Math.floor(Math.log2(points[i])),
        picks: gamePicks[i]
      })
    }
  }

  const gamesNested = []
  let k = 0
  for (let i = 0; i < GAMES_PER_ROUND.length; i++) {
    const gamesRound = []
    for (let j = 0; j < GAMES_PER_ROUND[i]; j++) {
      gamesRound.push(games[k])
      k++
    }
    gamesNested.push(gamesRound)
  }
  return gamesNested
}

function calcPointsRevival(picks, results) {
  const points = [0, 0, 0, 0, 0, 0, 0]
  let numPrevGames = 0
  for (let rnd = 0; rnd < picks.length; rnd++) {
    const picksRound = picks[rnd]
    for (let i = 0; i < GAMES_PER_ROUND[rnd]; i++) {
      const iAbs = i + numPrevGames
      if (picksRound[i] === results[iAbs]) {
        points[iAbs] = 1
        let rndBack = rnd - 1
        while (rndBack >= 0) {
          const numPrevBack = GAMES_PER_ROUND.slice(0, rndBack).reduce((a, b) => a + b, 0)
          if (picks[rndBack][iAbs - numPrevBack] !== results[iAbs]) break
          const childGame = PREV_GAME[iAbs][results[iAbs]]
          let j = 0
          let cg = childGame
          while (cg !== null && j < rnd - rndBack) {
            if (picks[rndBack][cg - numPrevBack] !== results[cg]) break
            cg = PREV_GAME[cg][results[cg]]
            j++
          }
          if (cg !== null && j < rnd - rndBack) break
          points[iAbs] *= 2
          rndBack--
        }
      }
    }
    numPrevGames += GAMES_PER_ROUND[rnd]
  }
  return points
}

/**
 * For each game calculates [picked winner, picked loser] for each pick in each game. This is used to
 * populate the text history of picks and scoring for each game
 */
function calcGamePicks(picks, results, teamNames) {
  const gamePicks = Array.from({ length: NUMGAMES }, () => [])
  for (let rnd = 0; rnd < picks.length; rnd++) {
    const picksRnd = picks[rnd]
    const prevGames = GAMES_PER_ROUND.slice(0, rnd).reduce((a, b) => a + b, 0)
    let resultsPre = results.slice(0, prevGames).concat(picksRnd)
    const absInds = makeAbsoluteBracket(resultsPre)
    const firstPick = GAMES_PER_ROUND.slice(0, rnd).reduce((a, b) => a + b, 0)
    for (let i = firstPick; i < NUMGAMES; i++) {
      const [iUpper, iLower] = absInds[i]
      gamePicks[i].push([teamNames[iUpper], teamNames[iLower], picksRnd[i - firstPick]])
    }
  }
  return gamePicks
}


function addPicks() {
  const year = $("#yearsel").val()

  const roundPicks = []
  const incomplete = []
  for (const m of matches) {
    if (m.roundIndex < picks.length) continue
    const pick = m.sides[0]?.isWinner ? 0 : m.sides[1]?.isWinner ? 1 : null
    roundPicks.push(pick)
    if (pick === null) {
      incomplete.push(m)
    }
  }

  if (incomplete.length > 0) {
    incomplete.forEach(m => { m.isLive = true })
    bracket.applyMatchesUpdates(incomplete)
    $("#statustext").text("Please complete all " + incomplete.length + " missing picks.")
    return
  }

  picks.push(roundPicks)

  $("#statustext").text(picks.length >= 3 ? "All done! Reset or select a new year." : "Click on the blue points icon to see score details. Make your next picks and Submit to continue.")
  if (picks.length >= 3) {
    $("#resetbutton").show()
  }
  renderBracket(year, picks)
}

function removePicks() {
  if (picks.length == 0) return
  picks = picks.slice(0, -1)
  const year = $("#yearsel").val()
  renderBracket(year, picks)
  $("#statustext").text("")
  $("#resetbutton").hide()
}

function showGameModal(match) {
  document.getElementById("gameheader").textContent =
    DEMO_ROUND_NAMES[match.roundIndex] + " - Game " + String(match.order + 1)

  const gr = document.getElementById("gameresult")
  if (match.sides[0].isWinner) {
    gr.textContent = "Result: " + match.sides[0].contestantId + " over " + match.sides[1].contestantId
  } else {
    gr.textContent = "Result: " + match.sides[1].contestantId + " over " + match.sides[0].contestantId
  }

  const pickList = document.getElementById("picklist")
  pickList.innerHTML = ""
  match.picks.forEach((pick, i) => {
    const li = document.createElement("li")
    if (pick[2] === 0) {
      li.textContent = "Pick " + String(i + 1) + ": " + pick[0] + " over " + pick[1]
    } else {
      li.textContent = "Pick " + String(i + 1) + ": " + pick[1] + " over " + pick[0]
    }
    pickList.appendChild(li)
  })

  const gamePoints = document.getElementById("gamepoints")
  if (match.points !== null) {
    gamePoints.textContent = String(match.points) + (match.points === 1 ? " Point" : " Points")
  } else {
    gamePoints.textContent = ""
  }

  Modal.getOrCreateInstance(document.getElementById("gameModal")).show()
}

function renderBracket(year, picks) {
  $("#bracketdiv").empty()
  const bracketData = makeBracketryData(year, picks)
  matches = bracketData.matches

  const bracketOptions = {
    matchMaxWidth: 250,
    displayWholeRounds: true,
    liveMatchBorderColor: "#ff4545",
    matchStatusBgColor: "transparent",
    onMatchSideClick: (thisMatch, thisTopBottom) => {
      if (thisMatch.roundIndex < picks.length) return
      if (thisMatch.sides[thisTopBottom].isWinner) return
      if (thisMatch.sides[thisTopBottom].contestantId === undefined && thisMatch.sides[thisTopBottom].title === "") return

      thisMatch.sides[thisTopBottom].isWinner = true
      delete thisMatch.sides[1 - thisTopBottom].isWinner

      let [nextMatch, nextTopBottom] = getNextMatch(thisMatch.roundIndex, thisMatch.order)
      let firstNext = true

      const winnerId = thisMatch.sides[thisTopBottom].contestantId
      const updateMatches = [thisMatch]

      while (nextMatch !== null) {
        if (firstNext) {
          nextMatch.sides[nextTopBottom].contestantId = winnerId
          delete nextMatch.sides[nextTopBottom].title
          firstNext = false
        } else {
          nextMatch.sides[nextTopBottom].title = ""
          delete nextMatch.sides[nextTopBottom].contestantId
        }
        const wasWinner = nextMatch.sides[nextTopBottom].isWinner
        delete nextMatch.sides[nextTopBottom].isWinner
        if (wasWinner) delete nextMatch.matchStatus
        updateMatches.push(nextMatch)
        const nxt = getNextMatch(nextMatch.roundIndex, nextMatch.order)
        nextMatch = nxt[0]
        nextTopBottom = nxt[1]
        if (!wasWinner) nextMatch = null
      }
      bracket.applyMatchesUpdates(updateMatches)
      matches = bracket.getAllData().matches // update matches to new bracket data
    },
    getScoresHTML: (thisSide, thisMatch) => {
      if (thisSide.scores === undefined) return ""
      const score = thisSide.scores[0].mainScore
      return thisSide.isWinner ? "<span>" + String(score) + "</span>" : "<span style='opacity: 0.54'>" + String(score) + "</span>"
    },
    getPlayerTitleHTML: (player, context) => {
      const [numCorrect, correctHist, isLoser, isFromPick] = playerHtmlHelper(context.roundIndex, context.matchOrder, context.contestantId)

      let playerHTML
      if (isLoser) {
        playerHTML = "<span style='opacity: 0.54'>" + player.title + "</span>"
      }
      else if (isFromPick) {
        playerHTML = "<span style='color: #003ae6'>" + player.title + "</span>"
      }
      else {
        playerHTML = player.title
      }

      const checkmark = "<svg style='margin-right: -8px' xmlns='http://www.w3.org/2000/svg' height='18' width='18' viewBox='0 0 512 512'><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><circle fill='#888888' cy='256' cx='256' r='260'/><circle fill='#ffffff' cy='256' cx='256' r='200'/><path fill='#22bc20' d='M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z'/></svg>"

      const xmark = "<svg style='margin-right: -8px' xmlns='http://www.w3.org/2000/svg' height='18' width='18' viewBox='0 0 512 512'><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><circle fill='#888888' cy='256' cx='256' r='260'/><circle fill='#ffffff' cy='256' cx='256' r='200'/><path fill='#e21212' d='M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z'/></svg>"

      if (numCorrect == 0 || context.roundIndex >= picks.length) {
        return playerHTML
      }
      else {
        let titleHTML = playerHTML + " "
        correctHist.forEach(correct => {
          if (correct) {
            titleHTML += checkmark
          }
          else {
            titleHTML += xmark
          }
        })
        return titleHTML
      }
    },
    getNationalityHTML: player => {
      const teamId = player.espn_id
      return teamId === null ? "<span>?</span>" : "<img style='width: 30px' src='" + LOGO_URL(teamId) + "'>"
    }
  }

  bracket = createBracket(bracketData, document.getElementById("bracketdiv"), bracketOptions)

  $("#bracketdiv").off("click", ".demo-game-info").on("click", ".demo-game-info", function (e) {
    e.stopPropagation()
    const round = parseInt($(this).data("round"), 10)
    const order = parseInt($(this).data("order"), 10)
    const match = matches.find(m => m.roundIndex === round && m.order === order)
    if (match) showGameModal(match)
  })

  const mediaQuery = window.matchMedia("(max-width: 600px)")
  const mobileOptions = {
    navButtonsPosition: "beforeTitles",
    leftNavButtonHTML: "<div style='padding: 15px 15px; font-weight: bold;'>< PREV ROUND</div>",
    rightNavButtonHTML: "<div style='padding: 15px 15px; font-weight: bold;'>NEXT ROUND ></div>",
    roundTitlesFontSize: 26,
    roundTitlesVerticalPadding: 4,
    matchFontSize: 14,
    matchHorMargin: 14,
    distanceBetweenScorePairs: 10,
    scrollButtonPadding: "0px",
    matchMaxWidth: 200
  }
  const desktopOptions = {
    navButtonsPosition: "beforeTitles",
    leftNavButtonHTML: "<div style='padding: 15px 25px; font-weight: bold;'>< PREV ROUND</div>",
    rightNavButtonHTML: "<div style='padding: 15px 25px; font-weight: bold;'>NEXT ROUND ></div>",
    roundTitlesFontSize: 22,
    roundTitlesVerticalPadding: 8,
    matchFontSize: 14,
    matchHorMargin: 20,
    distanceBetweenScorePairs: 14,
    scrollButtonPadding: "0px",
    matchMaxWidth: 400,
    width: "80%"
  }
  const adjust = () => {
    bracket.applyNewOptions(mediaQuery.matches ? mobileOptions : desktopOptions)
  }
  mediaQuery.addEventListener("change", adjust)
  adjust()

  document.querySelectorAll(".player-title").forEach(el => { el.style.opacity = "1" })

  // renderScoreExplanation()
}

function renderScoreExplanation() {
  const el = document.getElementById("scoreexplanation")
  if (!picks.length) {
    el.textContent = ""
    return
  }
  const lines = []
  gamesNested.forEach((gamesRound, rInd) => {
    lines.push(DEMO_ROUND_NAMES[rInd])
    gamesRound.forEach((game, gInd) => {
      const gameLabel = "  Game " + String(gInd + 1) + ": "
      const matchup = (game.teams[0] ?? "?") + " vs " + (game.teams[1] ?? "?")
      lines.push(gameLabel + matchup)
      if (game.picks && game.picks.length > 0) {
        game.picks.forEach((pick, i) => {
          const winner = pick[2] === 0 ? pick[0] : pick[1]
          const loser = pick[2] === 0 ? pick[1] : pick[0]
          lines.push("    Pick " + String(i + 1) + ": " + winner + " over " + loser)
        })
      }
      if (game.points !== null) {
        lines.push("    " + String(game.points) + (game.points === 1 ? " point" : " points"))
      }
    })
  })
  el.textContent = lines.join("\n")
}

function makeBracketryData(year, picks) {
  const gamesNested = buildGamesNested(year, picks)
  const data = { rounds: [], matches: [], contestants: {} }

  DEMO_ROUND_NAMES.forEach(name => data.rounds.push({ name }))

  gamesNested[0].forEach(game => {
    data.contestants[game.teams[0]] = {
      entryStatus: String(game.seeds[0]),
      players: [{ title: game.teams[0], espn_id: game.espn_ids[0] }]
    }
    data.contestants[game.teams[1]] = {
      entryStatus: String(game.seeds[1]),
      players: [{ title: game.teams[1], espn_id: game.espn_ids[1] }]
    }
  })

  gamesNested.forEach((gamesRound, rInd) => {
    gamesRound.forEach((game, gInd) => {
      const match = {
        roundIndex: rInd,
        order: gInd,
        sides: makeMatchSides(game),
        picks: game.picks,
        points: game.points,
        correct: game.correct
      }
      if (rInd < picks.length && game.points !== null && game.picks && game.picks.length > 0) {
        const pts = String(game.points)
        const ptsSvg = "<svg xmlns='http://www.w3.org/2000/svg' height='35' width='35' viewBox='0 0 512 512' style='vertical-align:middle'><circle fill='#0d6efd' stroke='#0b5ed7' stroke-width='2' cx='256' cy='256' r='240'/><text x='256' y='256' font-size='280' font-weight='700' fill='#ffffff' text-anchor='middle' dominant-baseline='central' font-family='-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif'>" + pts + "</text></svg>"
        match.matchStatus = "<span class='demo-game-info' data-round='" + rInd + "' data-order='" + gInd + "' style='cursor:pointer; display:inline-block; line-height:0'>" + ptsSvg + "</span>"
      }
      data.matches.push(match)
    })
  })
  return data
}

function makeMatchSides(game) {
  let side0, side1
  if (game.teams[0] !== null && game.teams[0] !== undefined) {
    side0 = { contestantId: game.teams[0] }
  } else if (game.picks && game.picks.length > 0) {
    const last = game.picks[game.picks.length - 1]
    side0 = { contestantId: last[last[2]], fromPick: true }
  } else {
    side0 = { title: "" }
  }
  if (game.teams[1] !== null && game.teams[1] !== undefined) {
    side1 = { contestantId: game.teams[1] }
  } else if (game.picks && game.picks.length > 0) {
    const last = game.picks[game.picks.length - 1]
    side1 = { contestantId: last[1 - last[2]], fromPick: true }
  } else {
    side1 = { title: "" }
  }

  if (game.score && game.score[0] !== null) {
    side0.scores = [{ mainScore: game.score[0] }]
    side1.scores = [{ mainScore: game.score[1] }]
  }
  if (game.result === 0) side0.isWinner = true
  else if (game.result === 1) side1.isWinner = true

  return [side0, side1]
}

function playerHtmlHelper(roundIndex, order, contestantId) {
  const iAbs = GAMES_PER_ROUND.slice(0, roundIndex).reduce((a, b) => a + b, 0) + order
  const thisMatch = matches[iAbs]
  const sideIndex = thisMatch.sides[0].contestantId == contestantId ? 0 : 1

  const isLoser = thisMatch.sides[1 - sideIndex].isWinner
  const isFromPick = thisMatch.sides[sideIndex].fromPick

  // compare picks to actual winner for pick history - bit of a hack, but easier to do comparison here
  // than in backend at this point
  let numCorrect
  let winnerId

  if (thisMatch.correct == 0 && thisMatch.sides[1 - sideIndex].isWinner) {
    numCorrect = -1
    winnerId = thisMatch.sides[1 - sideIndex].contestantId
  }
  else if (thisMatch.correct > 0 && thisMatch.sides[sideIndex].isWinner) {
    numCorrect = thisMatch.correct
    winnerId = thisMatch.sides[sideIndex].contestantId
  }
  // no picks made, so this is an empty bracket
  else {
    return [0, [], isLoser, isFromPick]
  }

  let correctHist = []

  thisMatch.picks.forEach(pick => {
    if (pick[pick[2]] == winnerId) {
      correctHist.push(true)
    }
    else {
      correctHist.push(false)
    }
  })
  return [numCorrect, correctHist, isLoser, isFromPick]
}

// function getNextMatch(roundIndex, order) {
function getNextMatch(roundIndex, order) {
  const nextRoundIndex = roundIndex + 1
  const nextOrder = Math.floor(order / 2)
  const nextTopBottom = order % 2
  const nextMatch = matches.find(m => m.roundIndex === nextRoundIndex && m.order === nextOrder)
  return [nextMatch || null, nextTopBottom]
}
