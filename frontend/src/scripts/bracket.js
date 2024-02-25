// API_URL is in global namespace from constants.js

import { API_URL } from "./constants.js" 
import { createBracket } from "bracketry"
import $ from "jquery"

let index

$(document).ready(function() {
  $("#gobutton").on("click", changeBracket)
  $("#yearsel").on("change", populateCompetitions)
  $("#compsel").on("change", populatePlayerNames)

  initBracketPage()

  $("#editbutton").on("click", function() {
    editMode()
  })
})


function initBracketPage() {
  const params = new URLSearchParams(window.location.search)

  // check query params first, then local storage for year/comp
  if (params.has("year") && params.has("cid")) {
    displayMode()
    populateBracket({"year": params.get("year"),
      "cid": params.get("cid"),
      "pid": params.has("pid") ? params.get("pid") : "",
      "completedRounds": params.has("rounds") ? params.get("rounds") : ""
    })
  }
  // else if localStorage
  else {
    editMode()
  }
}


function editMode() {
  $("#editbutton").hide()
  $("#yearsel").show()
  $("#compsel").show()
  $("#playersel").show()
  $("#rndinput").show()
  $("#yearlabel").show()
  $("#complabel").show()
  $("#playerlabel").show()
  $("#rndlabel").show()
  $("#gobutton").show()

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
  $("#editbutton").show()
  $("#yearsel").hide()
  $("#compsel").hide()
  $("#playersel").hide()
  $("#rndinput").hide()
  $("#yearlabel").hide()
  $("#complabel").hide()
  $("#playerlabel").hide()
  $("#rndlabel").hide()
  $("#gobutton").hide()

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

  // Empty shows bracket
  playerOpt = document.createElement("option")
  playerOpt.value = ""
  playerOpt.textContent = "--NONE--"
  $("#playersel").append(playerOpt)

  // set to bracket only 
  $("#playersel").val(playerOpt.value).change()
}


function changeBracket() {
  // nests within function to avoid passing click arg to populateBracket
  populateBracket()
}


function populateBracket(args) {
  let year
  let cid
  let pid
  let completedRounds

  if (args === undefined) {
    year = $("#yearsel").val()
    cid = $("#compsel").val()
    pid = $("#playersel").val()
    completedRounds = $("#rndinput").val()
  }

  else {
    year = args.year
    cid = args.cid
    pid = args.pid
    completedRounds = args.completedRounds
  }

  let queryData = {"year": year, "cid": cid}

  if (completedRounds !== "") {
    queryData["completed_rounds"] = completedRounds
  }
  if (pid !== "") {
    queryData["pid"] = pid 
  }

  $.ajax({
    method: "GET",
    url: API_URL.bracket,
    data: queryData,
    crossDomain: true,
    success: function(result) {
      // game: {teams: [], seeds: [], score: [], result: 0/1}
      // teams/seeds/score=[null, null], result=null
      let gamesNested = result.games
      let champion = result.champion

      const bracketData = makeBracketryData(gamesNested)
      createBracket(bracketData, document.getElementById("bracketdiv"))
    }
  })
}


function makeBracketryData(gamesNested) {
  let data = {
    rounds: [],
    matches: [],
    contestants: {}
  }

  if (gamesNested.length == 6) {
    data.rounds = [
      { name: "First Round" },
      { name: "Second Round" },
      { name: "Sweet 16" },
      { name: "Elite 8" },
      { name: "Final 4" },
      { name: "Championship" }
    ]
  }
  else if (gamesNested.length == 3) {
    data.rounds = [
      { name: "Elite 8" },
      { name: "Final 4" },
      { name: "Championship" }
    ]
  }

  // first round has all contestants
  gamesNested[0].forEach((game) => {
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
  })

  gamesNested.forEach((gamesRound, rInd) => {
    gamesRound.forEach((game, gInd) => {
      const match = {
        roundIndex: rInd,
        order: gInd,
        sides: makeMatchSides(game)
      }

      data.matches.push(match)
    })
  })

  return data
}


function makeMatchSides(game) {
  let side0, side1

  if (game.teams[0] === null) {
    side0 = { title: "" }
  }
  else {
    side0 = { contestantId: game.teams[0] }
  }

  if (game.teams[1] === null) {
    side1 = { title: "" }
  }
  else {
    side1 = { contestantId: game.teams[1] }
  }

  if (game.score[0] !== null) {
    side0.scores = [{
      mainScore: game.score[0]
    }]
    side1.scores = [{
      mainScore: game.score[1]
    }]
  }

  if (game.result !== null) {
    side0.isWinner = game.result == 0
    side1.isWinner = game.result == 1
  }

  return [side0, side1]
}
