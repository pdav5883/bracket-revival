import { API_URL, LOGO_URL } from "./constants.js" 

import { 
  initCommon,
  initIndexYears,
  populateCompetitions,
  populatePlayerNames
} from "./shared.js"

import {
  initButtons,
  spinnerOn,
  spinnerOff,
  getValidAccessToken
} from "blr-shared-frontend"


import { createBracket } from "bracketry"
import $ from "jquery"

let bracket
let matches
let index
let yearSubmit // these submit variables store the values
let cidSubmit  // used to populate round start
let pidSubmit

$(async function() { 
  initCommon()
  initButtons(["gobutton", "submitbutton"])
  
  $("#gobutton").on("click", async () => await changeRoundStart())
  $("#submitbutton").on("click", async () => await submitPicks())
  $("#scoreboardbutton").on("click", goToScoreboard)
  $("#bracketbutton").on("click", goToBracket)
  $("#morepicksbutton").on("click", async () => await changeRoundStart())

  $("#yearsel").on("change", populateCompetitionsWrapper)
  $("#compsel").on("change", populatePlayerNamesWrapper)

  await initPickPage()

  // no switch to edit mode for picks page, since this
  // isn't part of game flow
})


async function initPickPage() {
  
  $("#submitbutton").hide()
  $("#scoreboardbutton").hide()
  $("#bracketbutton").hide()
  $("#morepicksbutton").hide()

  const queryParams = new URLSearchParams(window.location.search)

  initIndexYears(async function(ind) {
    index = ind

    if (queryParams.has("year") && queryParams.has("cid") && queryParams.has("pid")) {
      await changeRoundStart(queryParams)
    }
    // TODO deal with local storage from previous visit
  }, queryParams.get("year"), queryParams.get("cid"), queryParams.get("pid"))
}


function populateCompetitionsWrapper() {
  $("#statustext").text("")
  populateCompetitions(index)
}


function populatePlayerNamesWrapper() {
  $("#statustext").text("")
  populatePlayerNames(index)
}


function goToScoreboard() {
  window.location = "/scoreboard.html?year=" + yearSubmit + "&cid=" + cidSubmit
}


function goToBracket() {
  window.location = "/bracket.html?year=" + yearSubmit + "&cid=" + cidSubmit + "&pid=" + pidSubmit
}


async function changeRoundStart(queryParams) {
  // nests within function to avoid passing click arg to populate
  $("#submitbutton").hide()
  $("#scoreboardbutton").hide()
  $("#bracketbutton").hide()
  $("#morepicksbutton").hide()

  spinnerOn("gobutton")

  await populateRoundStart(queryParams, function() {
    spinnerOff("gobutton")
  })
}


async function populateRoundStart(queryParams, callback) {
  $("#statustext").text("")
  $("#bracketdiv").html("")
  
  let params
  if (queryParams === undefined) {
    params = {
      year: $("#yearsel").val(),
      cid: $("#compsel").val(),
      pid: $("#playersel").val()
    }
  }
  else {
    params = Object.fromEntries(queryParams)
  }

  yearSubmit = params.year
  cidSubmit = params.cid
  pidSubmit = params.pid

  $.ajax({
    method: "GET",
    url: API_URL.start,
    data: params,
    headers: {"authorization": await getValidAccessToken()},
    crossDomain: true,
    success: function(result) {
      // game: {teams: [], seeds: [], score: [], result: 0/1}
      // teams/seeds/score=[null, null], result=null

      // in case we got here by checking for more picks
      $("#submitbutton").show()

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
        },
        getNationalityHTML: player => {
          const teamId = player.espn_id
          if (teamId === null) {
            return '<span>?</span>'
          }
          else {
            return `<img style="width: 30px" src="${LOGO_URL(teamId)}">`
          }
        }
      }

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
        matchMaxWidth: 250
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
        scrollButtonPadding: "4px",
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

      if (callback) callback()
    },
    error: function(err) {
      if (err.status === 403) {
        $("#statustext").text("You must be signed in as " + $("#playersel").val())
      } else {
        $("#statustext").text(err.responseText)
      }
      if (callback) callback()
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


async function submitPicks() {
  $("#statustext").text("")
  $("#submitbutton").prop("disabled", true)
  spinnerOn("submitbutton")

  matches = bracket.getAllData().matches

  // use bracketry isLive feature to highlight unpicked games
  let incomplete = []
  matches.forEach(match => {
    if (!(match.sides[0].isWinner || match.sides[1].isWinner)) { 
      match.isLive = true
      incomplete.push(match)
    }
  })

  if (incomplete.length > 0) {
    spinnerOff("submitbutton")
    $("#statustext").text("Error: " + String(incomplete.length) + " missing picks. Use the Next/Prev Round buttons to navigate the full bracket.")
    $("#submitbutton").prop("disabled", false)
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

  const data = {"picks": picks}
  const queryString = `?year=${yearSubmit}&cid=${cidSubmit}&pid=${pidSubmit}`

  $.ajax({
    method: "POST",
    url: API_URL.picks + queryString,
    contentType: "application/json; charset=utf-8",
    headers: {"authorization": await getValidAccessToken()},
    data: JSON.stringify(data),
    crossDomain: true,
    success: function() {
      $("#submitbutton").prop("disabled", false)
      spinnerOff("submitbutton")
      $("#bracketdiv").html("") // clear the bracket so player doesn't try to edit picks
      $("#statustext").text("Submission successful!")

      $("#submitbutton").hide()
      $("#scoreboardbutton").show()
      $("#bracketbutton").show()
      $("#morepicksbutton").show()
    },
    error: function(err) {
      $("#submitbutton").prop("disabled", false)
      spinnerOff("submitbutton")
      
      if (err.status === 403) {
        $("#statustext").text("You must be signed in as " + $("#playersel").val())
      } else {
        $("#statustext").text(err.responseText)
      }
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
          espn_id: game.espn_ids[1],
        },
      ],
    };

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

function testFillBracket() {
  // Get all side-wrapper elements and click every other one (0, 2, 4, etc)
  $(".side-wrapper").each(function(index) {
    if (index % 2 === 0) {
      $(this).trigger("click")
      setTimeout(() => {}, 100)
    }
  })
}
