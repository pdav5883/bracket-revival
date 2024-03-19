import { API_URL } from "./constants.js" 
import { initIndexYears, populateCompetitions } from "./shared.js"
import $ from "jquery"


let index
let typeArg
let yearArg
let compArg

$(document).ready(function() {
  $.get("assets/nav.html", navbar => {
    $("#nav-placeholder").replaceWith(navbar)
  })
  
  $("#yearsel").on("change", populateCompetitionsWrapper)
  $("#subbutton").on("click", submitEdits)
  $("#gobutton").on("click", changeAdminPage)
  initAdminPage()
})


function initAdminPage() {
  $("#statustext").text("")
  initIndexYears(function(ind) {
    index = ind
  })
}


function populateCompetitionsWrapper() {
  populateCompetitions(index)
}


function populateResultsTable(year) {
  $.ajax({
    method: "GET",
    url: API_URL.bracket,
    data: {"year": year},
    crossDomain: true,
    success: function(gamesNested) {

      let table = document.getElementById("admintable")
      table.innerHTML = ""

      const bracketArray = buildBracketArray(gamesNested)

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
    success: function(gamesNested) {
      let gamesStart = gamesNested[0]

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


function populateCompetitionTable(year, cid) {
  $.ajax({
    method: "GET",
    url: API_URL.competitions,
    data: {"year": year, "cid": cid},
    crossDomain: true,
    success: function(result) {
      let table = document.getElementById("admintable")
      table.innerHTML = ""

      // delete game
      let row = table.insertRow()
      let cell = row.insertCell()
      let input = makeCheckboxInput("delete_competition", "Delete Competition")
      cell.appendChild(input[0])
      input[1].classList.add("form-label")
      cell.appendChild(input[1])

      // email all
      row = table.insertRow()
      cell = row.insertCell()
      input = makeCheckboxInput("email_all", "Email All")
      cell.appendChild(input[0])
      input[1].classList.add("form-label")
      cell.appendChild(input[1])
      cell = row.insertCell()
      input = makeTextInput("email_deadline", 16, "DEADLINE")
      cell.appendChild(input)

      // require secret
      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Require Secret"
      cell = row.insertCell()
      input = makeBooleanSelect("selsecret", result.require_secret)
      cell.appendChild(input)
      
      // open players
      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Open Players"
      cell = row.insertCell()
      input = makeBooleanSelect("selplayers", result.open_players)
      cell.appendChild(input)

      // open picks
      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Open Picks"
      cell = row.insertCell()
      input = makeBooleanSelect("selpicks", result.open_picks)
      cell.appendChild(input)

      // completed rounds
      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Completed Rounds"
      cell = row.insertCell()
      input = makeTextInput("inprounds", 2, result.completed_rounds)
      cell.appendChild(input)

      // players
      Object.keys(result.scoreboard).forEach((name, i) => {
        // old name
        row = table.insertRow()
        cell = row.insertCell()
        cell.textContent = name
        cell.id = "old_" + i

        // new name
        cell = row.insertCell()
        input = makeTextInput("new_" + i, 10, name)
        cell.appendChild(input)

        // add delete checkbox
        cell = row.insertCell()
        input = makeCheckboxInput("delete_" + i, "Delete")
        cell.appendChild(input[0]) // checkbox
        cell.appendChild(input[1]) // label

        // email
        cell = row.insertCell()
        input = makeCheckboxInput("email_" + i, "Email")
        cell.appendChild(input[0]) // checkbox
        cell.appendChild(input[1]) // label
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
      let game = gamesNested[rnd][i]
      game["rowSpan"] = 2 ** rnd
      game["flatIndex"] = flat
      flat++

      bracketArray[i * (2 ** rnd)][rnd] = game
    }
  }

  return bracketArray
}


function makeBooleanSelect(id, current) {
  let select = document.createElement("select")
  select.id = id
  let option = document.createElement("option")
  option.value = true
  option.textContent = "True"
  select.appendChild(option)
  option = document.createElement("option")
  option.value = false
  option.textContent = "False"
  select.appendChild(option)

  if (current !== undefined) {
    select.value = current
  }

  return select
}

function makeTextInput(id, numchar=2, current="") {
  let input = document.createElement("input")
  input.setAttribute("type", "text")
  input.setAttribute("id", id)
  input.setAttribute("size", numchar)
  input.setAttribute("value", current)

  return input
}

function makeCheckboxInput(id, labelStr) {
  let input = document.createElement("input")
  input.setAttribute("type", "checkbox")
  input.setAttribute("id", id)

  let label = document.createElement("label")
  label.textContent = labelStr
  label.setAttribute("for", id)
  
  return [input, label]
}


function submitEdits() {
  if (typeArg === "results") {
    submitResultsEdits()
  }
  else if (typeArg === "teams") {
    submitTeamsEdits()
  }
  else if (typeArg === "competition") {
    submitCompetitionEdits()
  }
}


function submitResultsEdits() {

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


function submitCompetitionEdits() {
  $("#statustext").text("")

  const numPlayers = $("[id^=old_").length
  let players = {}
  let emailNames = []

  for (let i = 0; i < numPlayers; i++) {
    players[$("#old_" + i).text()] = $("#new_" + i).val()

    // setting player to null deletes from competition
    if ($("#delete_" + i).is(":checked")) {
      players[$("#old_" + i).text()] = null
    }

    if ($("#email_" + i).is(":checked")) {
      emailNames.push($("#old_" + i).text())
    }
  }

  const data = {
    "delete_competition": $("#delete_competition").is(":checked"),
    "email_all": $("#email_all").is(":checked"),
    "deadline": $("#email_deadline").val(),
    "completed_rounds": parseInt($("#inprounds").val()),
    "open_picks": $("#selpicks").val(),
    "open_players": $("#selplayers").val(),
    "require_secret": $("#selsecret").val(),
    "email_individual": emailNames,
    "players": players}

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: {"authorization": $("#pwdtext").val()},
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"etype": "competition", "year": yearArg, "cid": compArg, "data": data}),

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
  compArg = $("#compsel").val()
  
  $("#statustext").text("")

  if (typeArg === "results") {
    populateResultsTable(yearArg)
  }
  else if (typeArg === "teams") {
    populateTeamsTable(yearArg)
  }
  else if (typeArg === "competition") {
    populateCompetitionTable(yearArg, compArg)
  }
}
