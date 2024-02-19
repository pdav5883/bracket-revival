
let index
let typeArg
let yearArg

$(document).ready(function() {
  //$("#yearsel").on("change", populateCompetitions)
  $("#subbutton").on("click", submitEdits)
  $("#gobutton").on("click", changeAdminPage)
  initAdminPage()
})


function initAdminPage() {
  $("#statustext").text("")
  
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


/*
function populateCompetitions() {
  // need to clear options, or list will always grow
  $("#gamesel").empty()

  $.ajax({
    method: "GET",
    url: pickem_api_url,
    data: {"qtype": "games", "year": $("#yearsel").val()},
    crossDomain: true,
    success: function(res) {
      let game

      Object.keys(res).forEach(gid => {
	game = document.createElement("option")
	game.value = gid
	game.textContent = gid.replace("-", " ")
	$("#gamesel").append(game)
      })
    }
  })
}
*/


function populateResultsTable(year) {
  $.ajax({
    method: "GET",
    url: API_URL.bracket,
    data: {"year": year},
    crossDomain: true,
    success: function(result) {
      let gamesNested = result.games

      let table = document.getElementById("admintable")
      table.innerHTML = ""

      bracketArray = buildBracketArray(gamesNested)

      bracketArray.forEach(bracketRow => {
	let tableRow = table.insertRow()
	bracketRow.forEach(bracketCell => {
	  if (bracketCell !== null) {
	    buildMatchup(tableRow.insertCell(), bracketCell)
	  }
	})
      })
    }
  })
}


function populateTeamsTable(year) {
  $.ajax({
    method: "GET",
    url: API_URL.bracket,
    data: {"year": year},
    crossDomain: true,
    success: function(result) {
      let gamesStart = result.games[0]

      let table = document.getElementById("admintable")
      table.innerHTML = ""

      let i = 0
      gamesStart.forEach(game => {
	let tableRow = table.insertRow()
	
	let tableCell = tableRow.insertCell()
	tableCell.textContent = game.seeds[0]
	
	tableCell = tableRow.insertCell()
	let inp = makeTextInput("name_" + i, 10, game.teams[0])
	tableCell.appendChild(inp)
	
	tableCell = tableRow.insertCell()
	inp = makeTextInput("short_" + i, 4, game.shorts[0])
	tableCell.appendChild(inp)
	i++

	tableRow = table.insertRow()
	
	tableCell = tableRow.insertCell()
	tableCell.textContent = game.seeds[1]
	
	tableCell = tableRow.insertCell()
	inp = makeTextInput("name_" + i, 10, game.teams[1])
	tableCell.appendChild(inp)
	
	tableCell = tableRow.insertCell()
	inp = makeTextInput("short_" + i, 4, game.shorts[1])
	tableCell.appendChild(inp)
	i++
      })
    }
  })
}


function buildMatchup(tableCell, bracketCell) {
  tableCell.rowSpan = bracketCell.rowSpan
  tableCell.id = "game_" + bracketCell.flatIndex

  let t0 = document.createElement("span")
  t0.textContent = bracketCell.teams[0] === null ? "---" : "#" + bracketCell.seeds[0] + " " + bracketCell.teams[0]
  let t1 = document.createElement("span")
  t1.textContent = bracketCell.teams[1] === null ? "---" : "#" + bracketCell.seeds[1] + " " + bracketCell.teams[1]

  if (bracketCell.result == 0) {
    t0.classList.add("winnerspan")
  }
  else if (bracketCell.result == 1) {
    t1.classList.add("winnerspan")
  }

  let score0 = makeTextInput("score0_" + bracketCell.flatIndex, 2, bracketCell.score[0] === null ? "" : bracketCell.score[0])
  let score1 = makeTextInput("score1_" + bracketCell.flatIndex, 2, bracketCell.score[1] === null ? "" : bracketCell.score[1])

  t0.appendChild(score0)
  t1.appendChild(score1)

  tableCell.appendChild(t0)
  tableCell.appendChild(document.createElement("br"))
  tableCell.appendChild(t1)
}


// reformat nested games into 2D array mapping to each cell and add rowspan property to game
function buildBracketArray(gamesNested) {
  const numCols = gamesNested.length
  const numRows = gamesNested[0].length

  let bracketArray = [...Array(numRows)].map(() => Array(numCols).fill(null))

  let rnd
  let i
  let flat = 0

  for (rnd = 0; rnd < gamesNested.length; rnd++) {
    for (i = 0; i < gamesNested[rnd].length; i++) {
      game = gamesNested[rnd][i]
      game["rowSpan"] = 2 ** rnd
      game["flatIndex"] = flat
      flat++

      bracketArray[i * (2 ** rnd)][rnd] = game
    }
  }

  return bracketArray
}


function makeTextInput(id, numchar=2, current="") {
  let input = document.createElement("input")
  input.setAttribute("type", "text")
  input.setAttribute("id", id)
  input.setAttribute("size", numchar)
  input.setAttribute("value", current)

  return input
}


function submitEdits() {
  if (typeArg === "results") {
    submitResultsEdits()
  }
  else if (typeArg === "teams") {
    submitTeamsEdits()
  }
}


function submitResultsEdits() {
  let table = document.getElementById("admintable")

  $("#statustext").text("")

  const numGames = $("[id^=game_").length
  let results = Array(numGames).fill(null)
  let scores = Array(numGames).fill([null, null])

  for (let i = 0; i < numGames; i++) {
    let score0 = parseInt($("#score0_" + i).val())
    let score1 = parseInt($("#score1_" + i).val())

    if (!isNaN(score0) && !isNaN(score1)) {
      scores[i] = [score0, score1]
      results[i] = score0 > score1 ? 0 : 1
    }
  }

  const data = {"results": results, "scores": scores}

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: {"authorization": $("#pwdtext").val()},
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"etype": "results", "year": yearArg, "data": data}),

    success: function() {
      $("#statustext").text("Success!")
    },

    error: function(err) {
      if (err.status == 403) {
	$("#statustext").text("Error: incorrect password")
      }
      else {
	$("#statustext").text("Error: unknown submission error")
      }
    }
  })
}


function submitTeamsEdits() {
  let table = document.getElementById("admintable")

  $("#statustext").text("")

  const numTeams = $("[id^=name_").length
  let names_shorts = []

  for (let i = 0; i < numTeams; i++) {
    names_shorts.push([$("#name_" + i).val(), $("#short_" + i).val()])
  }

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: {"authorization": $("#pwdtext").val()},
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"etype": "teams", "year": yearArg, "data": names_shorts}),

    success: function() {
      $("#statustext").text("Success!")
    },

    error: function(err) {
      if (err.status == 403) {
	$("#statustext").text("Error: incorrect password")
      }
      else {
	$("#statustext").text("Error: unknown submission error")
      }
    }
  })
}


function changeAdminPage() {
  typeArg = $("#typesel").val()
  yearArg = $("#yearsel").val()
  
  $("#statustext").text("")

  if (typeArg === "results") {
    populateResultsTable(yearArg)
  }
  else if (typeArg === "teams") {
    populateTeamsTable(yearArg)
  }
}
