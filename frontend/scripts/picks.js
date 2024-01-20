const start_api_url = "http://0.0.0.0:5000/start"
const update_api_url = "http://0.0.0.0:5000/update"
const competitions_api_url = "http://0.0.0.0:5000/competitions"

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
      url: competitions_api_url,
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

  queryData = {"year": yearSubmit, "cid": cidSubmit, "pid": pidSubmit}

  $.ajax({
    method: "GET",
    url: start_api_url,
    data: queryData,
    crossDomain: true,
    success: function(startGames) {
      // game: {teams: [], seeds: [], score: [], result: 0/1}
      // teams/seeds/score=[null, null], result=null
      let table = document.getElementById("brackettable")
      table.innerHTML = ""

      bracketArray = buildStartBracketArray(startGames)

      bracketArray.forEach(bracketRow => {
	let tableRow = table.insertRow()
	bracketRow.forEach(bracketCell => {
	  if (bracketCell !== null) {
	    buildPickMatchup(tableRow.insertCell(), bracketCell)
	  }
	})
      })

      // adds the on-click listeners to populate picks in bracket
      addBracketListeners()
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

  data = {"year": yearSubmit, "cid": cidSubmit, "pid": pidSubmit, "picks": picks}

  $.ajax({
    method: "POST",
    url: update_api_url,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(data),
    crossDomain: true,
    success: function() {
      $("#statustext").text("Submission successful!")
    },
    failure: function(e) {
      $("#statustext").text("Server Error: TODO")
    }
  })
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


// populate spans in each matchup
function buildPickMatchup(tableCell, bracketCell) {
  
  const rnd = bracketCell.index[0]
  const gm = bracketCell.index[1]
  
  const nextRnd = bracketCell.nextIndex[0]
  const nextGm = bracketCell.nextIndex[1]
  const nextSpan = gm % 2 // tells us whether this goes into top or bottom span entry of next game
  const nextSpanId = nextRnd === null ? null : "span_" + nextRnd + "_" + nextGm + "_" + nextSpan

  tableCell.rowSpan = bracketCell.rowSpan
  tableCell.id = "cell_" + rnd + "_" + gm

  let t0 = document.createElement("span")
  t0.textContent = bracketCell.teams[0] === null ? "---" : "#" + bracketCell.seeds[0] + " " + bracketCell.teams[0]

  let t1 = document.createElement("span")
  t1.textContent = bracketCell.teams[1] === null ? "---" : "#" + bracketCell.seeds[1] + " " + bracketCell.teams[1]

  t0.id = "span_" + rnd + "_" + gm + "_" + "0"
  t0.opponentId = "span_" + rnd + "_" + gm + "_" + "1"
  t0.nextId = nextSpanId
  t0.flatIndex = bracketCell.flatIndex  // helps with populating flat picks arrray
  t0.topBottom = 0  // helps with flat picks array

  t1.id = "span_" + rnd + "_" + gm + "_" + "1"
  t1.opponentId = "span_" + rnd + "_" + gm + "_" + "0"
  t1.nextId = nextSpanId
  t1.flatIndex = bracketCell.flatIndex
  t1.topBottom = 1

  tableCell.appendChild(t0)
  tableCell.appendChild(document.createElement("br"))
  tableCell.appendChild(t1)
}


// reformat nested games into 2D array mapping to each cell and add rowspan property to game
function buildStartBracketArray(startGames) {
  const numRows = startGames.length

  let numCols = 1

  while (2 ** (numCols - 1) < numRows) {
    numCols++
  }

  let bracketArray = [...Array(numRows)].map(() => Array(numCols).fill(null))

  // round 0 is the only one that has populated games
  let i
  let flat = 0
  for (i = 0; i < numRows; i++) {
    game = startGames[i]
    game.rowSpan = 1
    game.index = [0, i] // index contains round, game-within round index for id referencing later
    game.flatIndex = flat // flat index for keeping track of how game fits in flat pick submission
    game.nextIndex = numCols == 1 ? [null, null] : [1, Math.floor(i / 2)] // index of the game where winner goes
    bracketArray[i][0] = game
    flat++
  }

  let rnd
  for (rnd = 1; rnd < numCols; rnd++) {
    for (i = 0; i < numRows; i += 2 ** rnd) {
      game = {"teams": [null, null],
              "rowSpan": 2 ** rnd,
              "index": [rnd, i / (2 ** rnd)],
	      "flatIndex": flat,
              "nextIndex": numCols == (rnd + 1) ? [null, null] : [rnd + 1, Math.floor(i / (2 ** (rnd + 1)))]}
      bracketArray[i][rnd] = game
      flat++
    }
  }
  return bracketArray
}

