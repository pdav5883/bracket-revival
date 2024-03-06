import { API_URL } from "./constants.js" 
import { createBracket } from "bracketry"
import $ from "jquery"

let bracket
let index
let yearSubmit // these submit variables store the values
let cidSubmit  // used to populate round start
let pidSubmit

$(document).ready(function() {
  $.get("assets/nav.html", navbar => {
    $("#nav-placeholder").replaceWith(navbar)
  })
  
  $("#gobutton").on("click", changeRoundStart)
  $("#submitbutton").on("click", submitPicks)
  $("#yearsel").on("change", populateCompetitions)
  $("#compsel").on("change", populatePlayerNames)

  initPickPage()

  // no switch to edit mode for picks page, since this
  // isn't part of game flow
})


function initPickPage() {
  const params = new URLSearchParams(window.location.search)

  // check query params first, then local storage for year/comp
  if (params.has("year") &&
      params.has("cid") &&
      params.has("pid")) {
    displayMode(params.get("year"), params.get("cid"), params.get("pid"))
    populateRoundStart({"year": params.get("year"),
      "cid": params.get("cid"),
      "pid": params.get("pid")})
  }
  // else if localStorage
  else {
    editMode()
  }
}


function editMode() {
  $("#yeardisplay").hide()
  $("#compdisplay").hide()
  $("#playerdisplay").hide()
  $("#yearsel").show()
  $("#compsel").show()
  $("#playersel").show()
  $("#yearlabel").show()
  $("#complabel").show()
  $("#playerlabel").show()
  $("#gobutton").show()
  $("#submitbutton").show()

  // first time we populate selects, call backend
  if (index === undefined) {
    $.ajax({
      method: "GET",
      url: API_URL.competitions,
      data: {},
      crossDomain: true,
      success: function(result) {
        index = result

        //populate years
        let yearOpt
        for (const year in index) {
          yearOpt = document.createElement("option")
          yearOpt.value = year
          yearOpt.textContent = year
          $("#yearsel").append(yearOpt)
        }

        // set to latest year with change to populate competitions
        $("#yearsel").val(yearOpt.value).change()
      }
    })
  }
}


function displayMode(year, cid, pid) {
  $("#yeardisplay").show()
  $("#compdisplay").show()
  $("#playerdisplay").show()
  $("#yearsel").hide()
  $("#compsel").hide()
  $("#playersel").hide()
  $("#yearlabel").hide()
  $("#complabel").hide()
  $("#playerlabel").hide()
  $("#gobutton").hide()
  $("#submitbutton").show()

  $("#yearinsert").text(year)
  $("#compinsert").text(cid)
  $("#playerinsert").text(pid)
}


function populateCompetitions() {
  $("#compsel").empty()

  let compOpt
  for (const compName in index[$("#yearsel").val()]) {
    compOpt = document.createElement("option")
    compOpt.value = compName
    compOpt.textContent = compName
    $("#compsel").append(compOpt)
  }

  // set to last competition
  // TODO is this right?
  $("#compsel").val(compOpt.value).change()
}


function populatePlayerNames() {
  $("#playersel").empty()

  let playerOpt
  for (const playerName of index[$("#yearsel").val()][$("#compsel").val()]) {
    playerOpt = document.createElement("option")
    playerOpt.value = playerName
    playerOpt.textContent = playerName
    $("#playersel").append(playerOpt)
  }

  // Empty option
  playerOpt = document.createElement("option")
  playerOpt.value = ""
  playerOpt.textContent = ""
  $("#playersel").append(playerOpt)

  // set to empty 
  $("#playersel").val(playerOpt.value).change()
}


function changeRoundStart() {
  // nests within function to avoid passing click arg to populate
  populateRoundStart()
}


function populateRoundStart(args) {
  $("#statustext").text("")
  
  if (args === undefined) {
    yearSubmit = $("#yearsel").val()
    cidSubmit = $("#compsel").val()
    pidSubmit = $("#playersel").val()
  }

  else {
    yearSubmit = args.year
    cidSubmit = args.cid
    pidSubmit = args.pid
  }

  const queryData = {"year": yearSubmit, "cid": cidSubmit, "pid": pidSubmit}

  $.ajax({
    method: "GET",
    url: API_URL.start,
    data: queryData,
    crossDomain: true,
    success: function(result) {
      // game: {teams: [], seeds: [], score: [], result: 0/1}
      // teams/seeds/score=[null, null], result=null

      let bracketData = makeBracketryStartData(result.start_games, result.bonus_games)
      prepopulateBracket(bracketData)

      const bracketOptions = {
        //maxMatchWidth: 250,
        displayWholeRounds: true,
        liveMatchBorderColor: "#ff4545",
        matchStatusBgColor: "#5a9cd8",
        onMatchSideClick: (thisMatch, thisTopBottom) => {
          // if click is already on winner, don't do anything
          if (thisMatch.sides[thisTopBottom].isWinner) {
            return
          }

          // if we clicked on space where no team had yet been picked, do nothing
          if (thisMatch.sides[thisTopBottom].contestantId === undefined) {
            return
          }

          // highlight winner for clicked match
          thisMatch.sides[thisTopBottom].isWinner = true
          delete thisMatch.sides[1 - thisTopBottom].isWinner

          // insert points for clicked match
          if (thisMatch.sides[thisTopBottom].contestantId == thisMatch.prevPickWinner) {
            thisMatch.matchStatus = String(2 ** (thisMatch.roundIndex + thisMatch.prevPickWinnerNum))
          }
          else {
            thisMatch.matchStatus = String(2 ** thisMatch.roundIndex)
          }

          // isLive used to show missing picks
          delete thisMatch.isLive

          let updateMatches = [thisMatch]

          // grab the full current bracket once. contains deep_copy so not efficient
          const allData = bracket.getAllData()

          let [nextMatch, nextTopBottom] = getNextMatch(allData, thisMatch.roundIndex, thisMatch.order)

          let firstNext = true
          
          // keep going down bracket if pick we changed is winner
          while (nextMatch !== null) {
            // for first nextGame, fill in new pick name
            if (firstNext) {
              nextMatch.sides[nextTopBottom].contestantId = thisMatch.sides[thisTopBottom].contestantId 
              delete nextMatch.sides[nextTopBottom].title
              //delete nextMatch.matchStatus
              firstNext = false
            }
            else {
              nextMatch.sides[nextTopBottom].title = ""
              delete nextMatch.sides[nextTopBottom].contestantId
              //delete nextMatch.matchStatus
            }

            // can't delete isWinner once nextMatch is pushed, so save for later
            const isWinner = nextMatch.sides[nextTopBottom].isWinner
            delete nextMatch.sides[nextTopBottom].isWinner

            if (isWinner) {
              delete nextMatch.matchStatus
            }

            updateMatches.push(nextMatch)

            if (isWinner) {
              // can't use destructuring here.
              const nxt = getNextMatch(allData, nextMatch.roundIndex, nextMatch.order)
              nextMatch = nxt[0]
              nextTopBottom = nxt[1]
            }
            else {
              nextMatch = null
            }
          }
          bracket.applyMatchesUpdates(updateMatches)
        }
      }

      bracket = createBracket(bracketData, document.getElementById("bracketdiv"), bracketOptions)
    }
  })
}


// performs in-place edit of bracketData to clear bracket contents and prepopulate with picks still alive
function prepopulateBracket(bracketData) {
  // clear bracket after round 0, because this is also used as reset
  bracketData.matches.forEach(match => {
    if (match.roundIndex > 0) {
      match.sides = [
        { title: "" },
        { title: "" }
      ]
      delete match.matchStatus
    }
  })

  let nextMatch, nextTopBottom
  
  // populate winners, points, contestantIds in next game
  bracketData.matches.forEach(match => {
    if (match.prevPickWinner !== undefined && match.prevPickWinner == match.sides[0].contestantId) {
      match.sides[0].isWinner = true
      match.matchStatus = String(2 ** (match.roundIndex + match.prevPickWinnerNum))

      const nxt = getNextMatch(bracketData, match.roundIndex, match.order)
      nextMatch = nxt[0]
      nextTopBottom = nxt[1]

      if (nextMatch !== null) {
        nextMatch.sides[nextTopBottom].contestantId = match.sides[0].contestantId
      }
    }
    else if (match.prevPickWinner !== undefined && match.prevPickWinner == match.sides[1].contestantId) {
      match.sides[1].isWinner = true
      match.matchStatus = String(2 ** (match.roundIndex + match.prevPickWinnerNum))

      const nxt = getNextMatch(bracketData, match.roundIndex, match.order)
      nextMatch = nxt[0]
      nextTopBottom = nxt[1]

      if (nextMatch !== null) {
        nextMatch.sides[nextTopBottom].contestantId = match.sides[1].contestantId
      }
    }
  })
}


function submitPicks() {
  $("#statustext").text("")

  let matches = bracket.getAllData().matches

  // use bracketry isLive feature to highlight unpicked games
  let incomplete = []
  matches.forEach(match => {
    if (!(match.sides[0].isWinner || match.sides[1].isWinner)) { 
      match.isLive = true
      incomplete.push(match)
    }
  })

  if (incomplete.length > 0) {
    $("#statustext").text("Error: " + String(incomplete.length) + " missing picks")
    bracket.applyMatchesUpdates(incomplete)
    return
  }

  matches.sort((a, b) => {
    if (a.roundIndex < b.roundIndex) {
      return -1
    }
    else if (a.roundIndex > b.roundIndex) {
      return 1
    }
    else if (a.order < b.order) {
      return -1
    }
    else if (a.order > b.order) {
      return 1
    }
    else {
      return 0
    }
  })

  let picks = []
  matches.forEach(match => {
    picks.push(match.sides[0].isWinner ? 0 : 1)
  })

  const data = {"year": yearSubmit, "cid": cidSubmit, "pid": pidSubmit, "picks": picks}

  $.ajax({
    method: "POST",
    url: API_URL.picks,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(data),
    crossDomain: true,
    success: function() {
      $("#statustext").text("Submission successful!")
    },
    failure: function() {
      $("#statustext").text("Server Error: TODO")
    }
  })
}


function makeBracketryStartData(startGames, bonusGames) {
  let data = {
    rounds: [],
    matches: [],
    contestants: {}
  }
  
  const roundNames = ["First Round", "Second Round",
    "Sweet 16", "Elite 8", "Final 4", "Championship"]

  // 32 games means we are in First Round
  const startRound = 5 - Math.log2(startGames.length)

  for (let i = startRound; i < roundNames.length; i++) {
    data.rounds.push({ name: roundNames[i] })
  }

  // add all matches in startRound
  startGames.forEach((game, gInd) => {
    data.contestants[game.teams[0]] = {
      entryStatus: String(game.seeds[0]),
      players: [
        {
          title: game.teams[0]
        }
      ]
    }
    data.contestants[game.teams[1]] = {
      entryStatus: String(game.seeds[1]),
      players: [
        {
          title: game.teams[1]
        }
      ]
    }

    // even if startRound > 0, the first round in bracket is 0
    const match = {
      roundIndex: 0,
      order: gInd,
      sides: [
        { contestantId: game.teams[0] },
        { contestantId: game.teams[1] }
      ]
    }
    data.matches.push(match)
  })

  let prevRoundGames = startGames.length

  // add empty matches beyond startRound
  for (let i = 1; i < data.rounds.length; i++) {
    for (let j = 0; j < prevRoundGames / 2; j++) {
      const match = {
        roundIndex: i,
        order: j,
        sides: [
          { title: "" },
          { title: "" }
        ]
      }
      data.matches.push(match)
    }
    prevRoundGames /= 2
  }

  // work through bonusGames to add multipliers and picks from last round
  bonusGames.forEach(bonusGame => {
    const [bonusRoundInd, bonusGameInd, bonusTeam, bonusNum] = bonusGame
    const bonusGameIndAbs = roundOrderToAbs(bonusRoundInd, bonusGameInd, data.matches.length)

    data.matches[bonusGameIndAbs].prevPickWinner = bonusTeam
    data.matches[bonusGameIndAbs].prevPickWinnerNum = bonusNum
  })

  return data
}


// return [nextRoundIndex, nextOrder, 0/1 (top/bottom)] for
// where winner of this game will go
// note: nextOrder is index within nextRound
function getNextMatchInds(roundIndex, order) {
  return [roundIndex + 1, Math.floor(order / 2), order % 2]
}

// return [nextMatch, 0/1 (top/bottom)]
function getNextMatch(bracketData, roundIndex, order) {
  const [nextRoundIndex, nextOrder, nextTopBottom] = getNextMatchInds(roundIndex, order)
  const nextMatchIndex = bracketData.matches.findIndex(m => {
    return m.roundIndex === nextRoundIndex && m.order === nextOrder
  })

  return [nextMatchIndex == -1 ? null : bracketData.matches[nextMatchIndex], nextTopBottom]
}


function roundOrderToAbs(roundIndex, order, numMatches) {
  if (numMatches === undefined) {
    numMatches = matches.length
  }

  let gamesPerRound
  if (numMatches == 63) {
    gamesPerRound = [32, 16, 8, 4, 2, 1]
  }
  else if (numMatches == 31) {
    gamesPerRound = [16, 8, 4, 2, 1]
  }
  else if (numMatches == 15) {
    gamesPerRound = [8, 4, 2, 1]
  }
  else if (numMatches == 7) {
    gamesPerRound = [4, 2, 1]
  }
  else if (numMatches == 3) {
    gamesPerRound = [2, 1]
  }
  else if (numMatches == 1) {
    gamesPerRound = [1]
  }

  // reduce takes sum of sliced array
  return gamesPerRound.slice(0, roundIndex).reduce((a, b) => a + b, 0) + order
}
