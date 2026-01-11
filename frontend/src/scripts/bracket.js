// API_URL is in global namespace from constants.js

import { API_URL, ROUND_NAMES } from "./constants.js" 
import {
  initIndexYears,
  populateCompetitions,
  populatePlayerNames,
  initCommon
} from "./shared.js"

import {
  initButtons,
  spinnerOn,
  spinnerOff,
  Modal
} from "blr-shared-frontend"

import { createBracket } from "bracketry"
import $ from "jquery"

let bracket
let matches // keep track of matches at top scope to help with playerHTML
let index


$(function() { 
  initCommon()
  initButtons(["gobutton"])
  $("#gobutton").on("click", () => changeBracket(undefined))
  $("#yearsel").on("change", populateCompetitionsWrapper)
  $("#compsel").on("change", populatePlayerNamesWrapper)

  initBracketPage()
})


function initBracketPage() {
  const queryParams = new URLSearchParams(window.location.search)

  initIndexYears(function(ind) {
    index = ind

    if (queryParams.has("year") && queryParams.has("cid") && queryParams.has("pid")) {
      changeBracket(queryParams)
    }
    // TODO deal with local storage from previous visit
  }, queryParams.get("year"), queryParams.get("cid"), queryParams.get("pid"))
}


function populateCompetitionsWrapper() {
  populateCompetitions(index)
}


function populatePlayerNamesWrapper() {
  populatePlayerNames(index, undefined,"--Results--")
}


function changeBracket(queryParams) {
  // spinner
  spinnerOn("gobutton")

  // nests within function to avoid passing click arg to populateBracket
  populateBracket(queryParams, function() {
    spinnerOff("gobutton")
  })
}


function populateBracket(queryParams, callback) {
  let year
  let cid
  let pid
  let completedRounds

  let params
  if (queryParams === undefined) {
    params = {
      year: $("#yearsel").val(),
      cid: $("#compsel").val(),
      pid: $("#playersel").val(),
      rounds: $("#rndinput").val() // rndinput select not implemented
    }
  }

  else {
    params = Object.fromEntries(queryParams)
  }

  $.ajax({
    method: "GET",
    url: API_URL.bracket,
    data: params,
    crossDomain: true,
    success: function(gamesNested) {
      const bracketData = makeBracketryData(gamesNested)

      const bracketOptions = {
        matchMaxWidth: 250,
        displayWholeRounds: true,
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
        },
        
        getScoresHTML: (thisSide, thisMatch) => {
          // game not played yet
          if (thisSide.scores === undefined) {
            return ""
          }

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

          if (numCorrect == 0) {
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
        // TODO make logo size variable with device
        getNationalityHTML: player => {
          const teamId = player.espn_id
          return `<img style="width: 30px" src="https://a1.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${teamId}.png&w=40&h=40&scale=crop&cquality=40">`
        }
      }

      matches = bracketData.matches
      bracket = createBracket(bracketData, document.getElementById("bracketdiv"), bracketOptions)

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
        matchMaxWidth: 250
      }

      const mediaQuery = window.matchMedia("(max-width: 600px)")

      const adjust = () => {
        if (mediaQuery.matches) {
          bracket.applyNewOptions(mobileOptions)
        }
        else {
          bracket.applyNewOptions(desktopOptions)
        }
      }

      mediaQuery.addEventListener("change", adjust)

      adjust()

      // change opacity for player-title div to 1, so that icons will not be opaque. Loser text is still made to be grayed
      // out in getPlayerTitleHTML
      for (const playerDiv of document.getElementsByClassName("player-title")) {
        playerDiv.style.opacity = "1"
      }

      if (callback) callback()
    },
    error: function(err) {
      if (callback) callback()
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
          title: game.teams[0],
          espn_id: game.espn_ids[0]
        }
      ]
    }
    data.contestants[game.teams[1]] = {
      entryStatus: String(game.seeds[1]),
      players: [
        {
          title: game.teams[1],
          espn_id: game.espn_ids[1]
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

  if (game.teams[0] !== null) {
    side0 = { contestantId: game.teams[0] }
  }

  // use most recent picks if game not yet played
  else if (game.picks.length > 0) {
    side0 = { contestantId: game.picks[game.picks.length - 1][0],
      fromPick: true }
  }
  else {
    side0 = { title: "" }
  }

  if (game.teams[1] !== null) {
    side1 = { contestantId: game.teams[1] }
  }
  else if (game.picks.length > 0) {
    side1 = { contestantId: game.picks[game.picks.length - 1][1],
      fromPick: true }
  }
  else {
    side1 = { title: "" }
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


// helper function to grab match info for getPlayerTitleHTML, which assumes contestantId is not null
// also returns isLoser to help HTML render figure out whether to set opacity, and is returned whether or
// not there are picks
// numCorrect: 1+ for correct picks, -1 for incorrect pick, 0 for no pick
// correctHist: [] for no picks, [True/False,...] for each round of picks
function playerHtmlHelper(roundIndex, order, contestantId) {
  const thisMatch = matches[roundOrderToAbs(roundIndex, order)]
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


// convert the roundIndex and order to absolute index into matches
function roundOrderToAbs(roundIndex, order) {
  let gamesPerRound
  if (matches.length == 63) {
    gamesPerRound = [32, 16, 8, 4, 2, 1]
  }
  else if (matches.length == 7) {
    gamesPerRound = [4, 2, 1]
  }

  // reduce takes sum of sliced array
  return gamesPerRound.slice(0, roundIndex).reduce((a, b) => a + b, 0) + order
}
