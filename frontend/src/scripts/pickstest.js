import { API_URL } from "./constants.js" 
import { createBracket } from "bracketry"
import $ from "jquery"

let bracket
let index
let yearSubmit // these submit variables store the values
let cidSubmit  // used to populate round start
let pidSubmit

$(document).ready(function() {
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
    displayMode()
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


function displayMode() {
  $("#yearsel").hide()
  $("#compsel").hide()
  $("#playersel").hide()
  $("#yearlabel").hide()
  $("#complabel").hide()
  $("#playerlabel").hide()
  $("#gobutton").hide()
  $("#submitbutton").show()

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
    success: function(startGames) {
      // game: {teams: [], seeds: [], score: [], result: 0/1}
      // teams/seeds/score=[null, null], result=null

      const bracketData = makeBracketryStartData(startGames)

      const bracketOptions = {
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

          let updateMatches = [thisMatch]

          // grab the full current bracket once. contains deep_copy so not efficient
          const allData = bracket.getAllData()

          let [nextMatch, nextTopBottom] = getNextMatch(allData, thisMatch.roundIndex, thisMatch.order)

          // thisMatch is championship
          if (nextMatch === null) {
            bracket.applyMatchesUpdates(updateMatches)
            return
          }
          // for match following thisMatch, fill in new pick name
          else {
            nextMatch.sides[nextTopBottom].contestantId = thisMatch.sides[thisTopBottom].contestantId 
            delete nextMatch.sides[nextTopBottom].title
          }
          
          // keep going down bracket if pick we changed is winner
          while (nextMatch !== null) {
            if (nextMatch.sides[nextTopBottom].isWinner) {
              delete nextMatch.sides[nextTopBottom].isWinner
              updateMatches.push(nextMatch)

              // get following match and remove name - for some reason can't use destructuring here...
              const nxt = getNextMatch(allData, nextMatch.roundIndex, nextMatch.order)
              nextMatch = nxt[0]
              nextTopBottom = nxt[1]

              // doesn't make sense to check for null here and in while
              if (nextMatch !== null) {
                nextMatch.sides[nextTopBottom].title = ""
                delete nextMatch.sides[nextTopBottom].contestantId
              }
            }
            else {
              break
            }
          }
          if (nextMatch !== null) {
            updateMatches.push(nextMatch)
          }
          bracket.applyMatchesUpdates(updateMatches)
        }
      }

      bracket = createBracket(bracketData, document.getElementById("bracketdiv"), bracketOptions)
    }
  })
}



function submitPicks() {
  $("#statustext").text("")

  // gather picks by putting all winnerspan entries into array
  const numPicks = $("[id^=cell_").length
  let picks = Array(numPicks).fill(null)

  $("span.winnerspan").each(function(i, e) {
    picks[e.flatIndex] = e.topBottom
  })

  // make sure that all picks have been made
  if (picks.some((e) => e === null)) {
    $("#statustext").text("Error: all picks must be made before submission")
    return
  }

  const data = {"year": yearSubmit, "cid": cidSubmit, "pid": pidSubmit, "picks": picks}

  $.ajax({
    method: "POST",
    url: API_URL.update,
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


function makeBracketryStartData(startGames) {
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

  return data
}


// return [nextRoundIndex, nextOrder, 0/1 (top/bottom)] for
// where winner of this game will go
// note: nextOrder is index within nextRound
function getNextMatchInds(roundIndex, order) {
  return [roundIndex + 1, Math.floor(order / 2), order % 2]
}

// return [prevRoundIndex, prevOrder] where topBottom is 0/1 int
function getPrevMatchInds(roundIndex, order, topBottom) {
  return [roundIndex - 1, 2 * order + topBottom]
}

function getNextMatch(bracketData, roundIndex, order) {
  const [nextRoundIndex, nextOrder, nextTopBottom] = getNextMatchInds(roundIndex, order)
  const nextMatchIndex = bracketData.matches.findIndex(m => {
    return m.roundIndex === nextRoundIndex && m.order === nextOrder
  })

  return [nextMatchIndex == -1 ? null : bracketData.matches[nextMatchIndex], nextTopBottom]
}

