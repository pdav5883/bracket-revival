// API_URL is in global namespace from constants.js

import { API_URL, ROUND_NAMES } from "./constants.js" 
import { createBracket } from "bracketry"
import { Modal } from "bootstrap"
import "bootstrap/dist/css/bootstrap.min.css"
import $ from "jquery"

let bracket
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
    success: function(gamesNested) {
      const bracketData = makeBracketryData(gamesNested)

      const bracketOptions = {
        onMatchClick: (thisMatch) => {
          // bracket not returned with picks
          if (thisMatch.picks.length == 0) {
            return
          }

          let gameHeader = document.getElementById("gameheader")
          gameHeader.textContent = ROUND_NAMES[thisMatch.roundIndex] + " - Game " + String(thisMatch.order + 1)

          let gameResult = document.getElementById("gameresult")
          gameResult.textContent = "Result: "

          if (thisMatch.sides[0].isWinner) {
            gameResult.textContent += thisMatch.sides[0].contestantId + " over " + thisMatch.sides[1].contestantId
          }
          else if (thisMatch.sides[1].isWinner) {
            gameResult.textContent += thisMatch.sides[1].contestantId + " over " + thisMatch.sides[0].contestantId
          }
          else {
            gameResult.textContent += "?"
          }

          let pickList = document.getElementById("picklist")
          pickList.innerHTML = ""

          thisMatch.picks.forEach((pick, i) => {
            let pickItem = document.createElement("li")
            pickItem.textContent = "Pick " + String(i + 1) + ": "
            if (pick[2] == 0) {
              pickItem.textContent += pick[0] + " over " + pick[1]
            }
            else if (pick[2] == 1) {
              pickItem.textContent += pick[1] + " over " + pick[0]
            }
            pickList.appendChild(pickItem)
          })

          if (thisMatch.points !== null) {
            let gameFooter = document.getElementById("gamepoints")
            gameFooter.textContent = String(thisMatch.points) + (thisMatch.points == 1 ? " Point" : " Points")
          }

          let modal = Modal.getOrCreateInstance(document.getElementById("gameModal"))
          modal.show()
        }
      }

      bracket = createBracket(bracketData, document.getElementById("bracketdiv"), bracketOptions)
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
    ROUND_NAMES.forEach(rname => {
      data.rounds.push({ name: rname })
    })
  }
  else if (gamesNested.length == 3) {
    ROUND_NAMES.slice(3).forEach(rname => {
      data.rounds.push({ name: rname })
    })
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
        sides: makeMatchSides(game),
        picks: game.picks,
        points: game.points,
        correct: game.correct
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

  if (game.result == 0) {
    side0.isWinner = true
  }
  else if (game.result == 1) {
    side1.isWinner = true
  }

  return [side0, side1]
}
