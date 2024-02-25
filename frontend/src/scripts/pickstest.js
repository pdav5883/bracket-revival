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
          const [nextRoundIndex, nextOrder, nextTopBottom] = getNextMatch(thisMatch.roundIndex, thisMatch.order)

          // start from next match already in bracket
          // note: this isn't efficient, but it's what bracketry exposes and how it does its own updates
          const allData = bracket.getAllData() // contains deep_copy of entire bracket, not efficient
          const nextMatchIndex = allData.matches.findIndex(m => {
            return m.roundIndex === nextRoundIndex && m.order === nextOrder
          })
          let nextMatch = allData.matches[nextMatchIndex]
          nextMatch.sides[nextTopBottom] = {
            contestantId: thisMatch.sides[thisTopBottom].contestantId
          }

          // highlight winner for clicked match
          thisMatch.sides[thisTopBottom].isWinner = true
          thisMatch.sides[1 - thisTopBottom].isWinner = false

          bracket.applyMatchesUpdates([nextMatch, thisMatch])
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
function getNextMatch(roundIndex, order) {
  return [roundIndex + 1, Math.floor(order / 2), order % 2]
}

// return [prevRoundIndex, prevOrder] where topBottom is 0/1 int
function getPrevMatch(roundIndex, order, topBottom) {
  return [roundIndex - 1, 2 * order + topBottom]
}

// this needs to happen after bracket table is loaded
function addBracketListeners() {
  // all spans in bracket
  $("[id^=span_]").each(function() {
    $(this).on("click", function() {
      
      // click will fire event even if already selected
      if ($(this).hasClass("winnerspan")) {
        return
      }

      // toggle winner for this game competition
      $(this).addClass("winnerspan")
      $("#" + $(this).prop("opponentId")).removeClass("winnerspan")

      // for next round only, want to add in name of this winner 
      let nextId = $(this).prop("nextId")
      if (nextId !== null) {
        $("#" + nextId).text($(this).text())

        // only keep going if we changed a winner
        if ($("#" + nextId).hasClass("winnerspan")) {
          $("#" + nextId).removeClass("winnerspan")
          nextId = $("#" + nextId).prop("nextId")
        }
        else {
          nextId = null
        }
      }

      // for all later rounds, just clear winner/name if this was already winner
      while (nextId !== null) {
        $("#" + nextId).text("---")

        if ($("#" + nextId).hasClass("winnerspan")) {
          $("#" + nextId).removeClass("winnerspan")
          nextId = $("#" + nextId).prop("nextId")
        }
        else {
          nextId = null
        }
      }
    })
  })
}

