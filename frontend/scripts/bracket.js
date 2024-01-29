// API_URL is in global namespace from constants.js

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

  queryData = {"year": year, "cid": cid}

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

      let table = document.getElementById("brackettable")
      table.innerHTML = ""

      bracketArray = buildBracketArray(gamesNested, champion)

      bracketArray.forEach(bracketRow => {
	let tableRow = table.insertRow()
	bracketRow.forEach(bracketCell => {
	  if (bracketCell !== null) {
	    if (bracketCell.champion) {
	      buildChampion(tableRow.insertCell(), bracketCell)
	    }
	    else {
	      buildMatchup(tableRow.insertCell(), bracketCell)
	    }
	  }
	})
      })

    }
  })
}


function buildChampion(tableCell, bracketCell) {
  tableCell.rowSpan = bracketCell.rowSpan
  let t = document.createElement("span")
  t.textContent = bracketCell.team === null ? "---" : "#" + bracketCell.seed + " " + bracketCell.team
  //t.textContent = bracketCell.team === null ? "---" : bracketCell.team  // simplified
  t.classList.add("winnerspan")

  if (bracketCell.points > 0) {
    t.textContent += " [" + bracketCell.points + "]"
  }

  // add blank elements for spacing - TODO:  there's got to be a better way
  for (let i = 0; i < bracketCell.picks.length; i++) {
    let pick = document.createElement("span")
    pick.classList.add("pickspan")
    tableCell.appendChild(pick)
    tableCell.appendChild(document.createElement("br"))
  }
  
  tableCell.appendChild(t)

  for (let i = 0; i < bracketCell.picks.length; i++) {
    let pick = document.createElement("span")
    pick.textContent = bracketCell.picks[i]
    pick.classList.add("pickspan")
    tableCell.appendChild(document.createElement("br"))
    tableCell.appendChild(pick)
  }
}


function buildMatchup(tableCell, bracketCell) {
  tableCell.rowSpan = bracketCell.rowSpan
  let t0 = document.createElement("span")
  t0.textContent = bracketCell.teams[0] === null ? "---" : "#" + bracketCell.seeds[0] + " " + bracketCell.teams[0]
  //t0.textContent = bracketCell.teams[0] === null ? "---" : bracketCell.teams[0]   // simplified
  let t1 = document.createElement("span")
  t1.textContent = bracketCell.teams[1] === null ? "---" : "#" + bracketCell.seeds[1] + " " + bracketCell.teams[1]
  //t1.textContent = bracketCell.teams[1] === null ? "---" : bracketCell.teams[1]    // simplified

  if (bracketCell.result == 0) {
    t0.classList.add("winnerspan")
    t0.textContent += " (" + bracketCell.score[0] + ")"
    t1.textContent += " (" + bracketCell.score[1] + ")"
  }
  else if (bracketCell.result == 1) {
    t1.classList.add("winnerspan")
    t0.textContent += " (" + bracketCell.score[0] + ")"
    t1.textContent += " (" + bracketCell.score[1] + ")"
  }

  if (bracketCell.points[0] > 0) {
    t0.textContent += " [" + bracketCell.points[0] + "]"
  }
  
  if (bracketCell.points[1] > 0) {
    t1.textContent += " [" + bracketCell.points[1] + "]"
  }

  for (let i = 0; i < bracketCell.picks[0].length; i++) {
    let pick = document.createElement("span")
    pick.textContent = bracketCell.picks[0][i]
    pick.classList.add("pickspan")
    tableCell.appendChild(pick)
    tableCell.appendChild(document.createElement("br"))
  }

  tableCell.appendChild(t0)
  tableCell.appendChild(document.createElement("br"))
  tableCell.appendChild(t1)
  
  for (let i = 0; i < bracketCell.picks[1].length; i++) {
    let pick = document.createElement("span")
    pick.textContent = bracketCell.picks[1][i]
    pick.classList.add("pickspan")
    tableCell.appendChild(document.createElement("br"))
    tableCell.appendChild(pick)
  }
}


// reformat nested games into 2D array mapping to each cell and add rowspan property to game
function buildBracketArray(gamesNested, champion) {
  const numCols = gamesNested.length + 1 // plus 1 for champion
  const numRows = gamesNested[0].length

  let bracketArray = [...Array(numRows)].map(() => Array(numCols).fill(null))

  let rnd
  let i

  for (rnd = 0; rnd < gamesNested.length; rnd++) {
    for (i = 0; i < gamesNested[rnd].length; i++) {
      game = gamesNested[rnd][i]
      game["rowSpan"] = 2 ** rnd
      game["champion"] = false

      bracketArray[i * (2 ** rnd)][rnd] = game
    }
  }

  champion["champion"] = true
  champion["rowSpan"] = 2 ** (gamesNested.length - 1)
  bracketArray[0][gamesNested.length] = champion

  return bracketArray
}

