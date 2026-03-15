import { API_URL } from "./constants.js"

import {
  initCommon,
  initIndexYears,
  populateCompetitions,
} from "./shared.js"

import {
  initButtons,
  spinnerOn,
  spinnerOff,
  getValidAccessToken
} from "blr-shared-frontend"

import $ from "jquery"


let index
let typeArg
let yearArg
let compArg

$(function () {
  initCommon()
  initButtons(["gobutton", "submitbutton"])

  $("#yearsel").on("change", populateCompetitionsWrapper)
  $("#submitbutton").on("click", async () => {
    spinnerOn("submitbutton")

    await submitEdits(() => {
      spinnerOff("submitbutton")
    })
  })

  $("#gobutton").on("click",() => {
    spinnerOn("gobutton")

    changeAdminPage(() => {
      spinnerOff("gobutton")
    })
  })

  initAdminPage()
})


function initAdminPage() {
  $("#statustext").text("")
  initIndexYears(function (ind) {
    index = ind
  })
}

function changeAdminPage(callback) {
  typeArg = $("#typesel").val();
  yearArg = $("#yearsel").val();
  compArg = $("#compsel").val();

  $("#statustext").text("");

  if (typeArg === "results") {
    populateResultsTable(yearArg, callback);
  } else if (typeArg === "resultsbygame") {
    populateResultsByGameTable(yearArg, callback);
  } else if (typeArg === "teams") {
    populateTeamsTable(yearArg, callback);
  } else if (typeArg === "competition") {
    populateCompetitionTable(yearArg, compArg, callback);
  } else if (typeArg === "addyear") {
    populateAddYearTable(callback)
  } else if (typeArg === "addcompetition") {
    populateAddCompetitionTable(callback)
  }
}

async function submitEdits(callback) {
  if (typeArg === "results") {
    await submitResultsEdits(callback);
  } else if (typeArg === "resultsbygame") {
    await submitResultsByGameEdits(callback);
  } else if (typeArg === "teams") {
    await submitTeamsEdits(callback);
  } else if (typeArg === "competition") {
    await submitCompetitionEdits(callback);
  } else if (typeArg === "addyear") {
    submitAddYear(callback);
  } else if (typeArg === "addcompetition") {
    submitAddCompetition(callback);
  }
}


function populateCompetitionsWrapper() {
  populateCompetitions(index)
}


function populateResultsTable(year, callback) {
  $.ajax({
    method: "GET",
    url: API_URL.bracket,
    data: { "year": year },
    crossDomain: true,
    success: function (gamesNested) {

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
      if (callback) callback()
    },
    error: function (err) {
      $("#statustext").text("Error: " + err.responseJSON.message)
      if (callback) callback()
    }
  })
}


function populateResultsByGameTable(year, callback) {
  $.ajax({
    method: "GET",
    url: API_URL.bracket,
    data: { "year": year },
    crossDomain: true,
    success: function (gamesNested) {
      let table = document.getElementById("admintable")
      table.innerHTML = ""

      const headerRow = table.insertRow()
      headerRow.insertCell().textContent = "Round"
      headerRow.insertCell().textContent = "Game"
      headerRow.insertCell().textContent = "Matchup"
      headerRow.insertCell().textContent = "ID"
      headerRow.insertCell().textContent = "Status"
      headerRow.insertCell().textContent = "Score 0"
      headerRow.insertCell().textContent = "Score 1"

      let flatIndex = 0
      for (let rnd = 0; rnd < gamesNested.length; rnd++) {
        for (let g = 0; g < gamesNested[rnd].length; g++) {
          const game = gamesNested[rnd][g]
          const row = table.insertRow()
          row.insertCell().textContent = "Round " + (rnd + 1)
          row.insertCell().textContent = "Game " + (g + 1)

          const matchup = game.teams[0] != null && game.teams[1] != null
            ? "#" + game.seeds[0] + " " + game.teams[0] + " vs #" + game.seeds[1] + " " + game.teams[1]
            : "—"
          row.insertCell().textContent = matchup

          const idInput = makeTextInput("gameid_" + flatIndex, 14, game.id ?? "")
          row.insertCell().appendChild(idInput)

          const statusSelect = document.createElement("select")
          statusSelect.id = "gamestatus_" + flatIndex
          ;["NOT_STARTED", "IN_PROGRESS", "COMPLETE"].forEach(s => {
            const opt = document.createElement("option")
            opt.value = s
            opt.textContent = s
            if (game.status === s) opt.selected = true
            statusSelect.appendChild(opt)
          })
          row.insertCell().appendChild(statusSelect)

          const score0 = makeTextInput("gamescore0_" + flatIndex, 3, game.score != null && game.score[0] != null ? String(game.score[0]) : "")
          row.insertCell().appendChild(score0)
          const score1 = makeTextInput("gamescore1_" + flatIndex, 3, game.score != null && game.score[1] != null ? String(game.score[1]) : "")
          row.insertCell().appendChild(score1)

          flatIndex++
        }
      }
      if (callback) callback()
    },
    error: function (err) {
      $("#statustext").text("Error: " + err.responseJSON.message)
      if (callback) callback()
    }
  })
}


function populateTeamsTable(year, callback) {
  $.ajax({
    method: "GET",
    url: API_URL.bracket,
    data: { "year": year },
    crossDomain: true,
    success: function (gamesNested) {
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
      if (callback) callback()
    },
    error: function (err) {
      $("#statustext").text("Error: " + err.responseJSON.message)
      if (callback) callback()
    }
  })
}


function populateCompetitionTable(year, cid, callback) {
  $.ajax({
    method: "GET",
    url: API_URL.competitions,
    data: { "year": year, "cid": cid },
    crossDomain: true,
    success: function (result) {
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

      // use game status (lock picks for started games)
      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Use Game Status"
      cell = row.insertCell()
      input = makeBooleanSelect("selgamestatus", result.use_game_status ?? false)
      cell.appendChild(input)

      // completed rounds (read-only, computed from results.json)
      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Completed Rounds"
      cell = row.insertCell()
      input = makeTextInput("inprounds", 2, result.completed_rounds_from_results)
      input.disabled = true
      cell.appendChild(input)
      cell.innerHTML += " (from results.json)"

      // started rounds (read-only, computed from results.json)
      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Started Rounds"
      cell = row.insertCell()
      input = makeTextInput("inprounds", 2, result.started_rounds_from_results)
      input.disabled = true
      cell.appendChild(input)
      cell.innerHTML += " (from results.json)"


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

        // autopick
        cell = row.insertCell()
        input = makeCheckboxInput("pick_" + i, "Autopick")
        cell.appendChild(input[0]) // checkbox
        cell.appendChild(input[1]) // label
      })
      if (callback) callback()
    },
    error: function (err) {
      $("#statustext").text("Error: " + err.responseJSON.message)
      if (callback) callback()
    }
  })
}

function populateAddYearTable(callback) {
  let table = document.getElementById("admintable");
  table.innerHTML = "";
  let row = table.insertRow();
  let cell = row.insertCell();
  cell.textContent = "Year";
  cell = row.insertCell();
  let input = makeTextInput("addyearval", 6, "");
  cell.appendChild(input);

  if (callback) callback()
}

function populateAddCompetitionTable(callback) {
  let table = document.getElementById("admintable");
  table.innerHTML = "";
  let row = table.insertRow();
  let cell = row.insertCell();
  cell.textContent = "Year";
  cell = row.insertCell();
  let input = makeTextInput("addyearval", 6, "");
  cell.appendChild(input);

  row = table.insertRow();
  cell = row.insertCell();
  cell.textContent = "Competition";
  cell = row.insertCell();
  input = makeTextInput("addcompetitionval", 20, "");
  cell.appendChild(input);

  if (callback) callback();
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

function makeTextInput(id, numchar = 2, current = "") {
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

async function submitResultsEdits(callback) {

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

  const data = { "results": results, "scores": scores }

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: { "authorization": await getValidAccessToken() },
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({ "etype": "results", "year": yearArg, "data": data }),

    success: function () {
      $("#statustext").text("Success!")
      if (callback) callback()
    },

    error: function(err) {
      adminSubmitError(err)
      if (callback) callback()
    }
  })
}


async function submitResultsByGameEdits(callback) {
  $("#statustext").text("")

  const numGames = $("[id^=gameid_").length
  const results = Array(numGames).fill(null)
  const scores = Array(numGames).fill([null, null])
  const ids = []
  const statuses = []

  for (let i = 0; i < numGames; i++) {
    const idVal = $("#gameid_" + i).val().trim()
    ids.push(idVal === "" ? null : idVal)
    statuses.push($("#gamestatus_" + i).val())

    const score0 = parseInt($("#gamescore0_" + i).val(), 10)
    const score1 = parseInt($("#gamescore1_" + i).val(), 10)
    if (!isNaN(score0) && !isNaN(score1)) {
      scores[i] = [score0, score1]
      results[i] = score0 > score1 ? 0 : 1
    }
  }

  const data = { "results": results, "scores": scores, "ids": ids, "statuses": statuses }

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: { "authorization": await getValidAccessToken() },
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({ "etype": "results", "year": yearArg, "data": data }),

    success: function () {
      $("#statustext").text("Success!")
      if (callback) callback()
    },

    error: function (err) {
      adminSubmitError(err)
      if (callback) callback()
    }
  })
}


async function submitTeamsEdits(callback) {

  $("#statustext").text("")

  const numTeams = $("[id^=name_").length
  let names_shorts = []

  for (let i = 0; i < numTeams; i++) {
    names_shorts.push([$("#name_" + i).val(), $("#short_" + i).val()])
  }

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: { "authorization": await getValidAccessToken() },
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({ "etype": "teams", "year": yearArg, "data": names_shorts }),

    success: function () {
      $("#statustext").text("Success!")
      if (callback) callback()
    },

    error: function(err) {
      adminSubmitError(err)
      if (callback) callback()
    }
  })
}


async function submitCompetitionEdits(callback) {
  $("#statustext").text("")

  const numPlayers = $("[id^=old_").length
  let players = {}
  let emailNames = []
  let autopickNames = []

  for (let i = 0; i < numPlayers; i++) {
    players[$("#old_" + i).text()] = $("#new_" + i).val()

    // setting player to null deletes from competition
    if ($("#delete_" + i).is(":checked")) {
      players[$("#old_" + i).text()] = null
    }

    if ($("#email_" + i).is(":checked")) {
      emailNames.push($("#old_" + i).text())
    }

    if ($("#pick_" + i).is(":checked")) {
      autopickNames.push($("#old_" + i).text())
    }
  }

  const data = {
    "delete_competition": $("#delete_competition").is(":checked"),
    "email_all": $("#email_all").is(":checked"),
    "deadline": $("#email_deadline").val(),
    "open_picks": $("#selpicks").val(),
    "open_players": $("#selplayers").val(),
    "use_game_status": $("#selgamestatus").val(),
    "email_individual": emailNames,
    "autopick_individual": autopickNames,
    "players": players
  }

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: { "authorization": await getValidAccessToken() },
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({ "etype": "competition", "year": yearArg, "cid": compArg, "data": data }),

    success: function () {
      $("#statustext").text("Success!")
      if (callback) callback()
    },

    error: function(err) {
      adminSubmitError(err)
      if (callback) callback()
    }
  })
}

async function submitAddYear(callback) {
  $("#statustext").text("");

  const queryParams = new URLSearchParams({
    type: "year",
    year: $("#addyearval").val(),
  });

  $.ajax({
    type: "PUT",
    url: API_URL.add + "?" + queryParams.toString(),
    headers: { authorization: await getValidAccessToken() },
    crossDomain: true,
    contentType: "application/json; charset=utf-8",

    success: function () {
      $("#statustext").text("Success!");
      if (callback) callback();
    },

    error: function (err) {
      adminSubmitError(err);
      if (callback) callback();
    },
  });
}


async function submitAddCompetition(callback) {
  $("#statustext").text("");

  const queryParams = new URLSearchParams({
    type: "competition",
    year: $("#addyearval").val(),
    compname: $("#addcompetitionval").val(),
  });

  $.ajax({
    type: "PUT",
    url: API_URL.add + "?" + queryParams.toString(),
    headers: { authorization: await getValidAccessToken() },
    crossDomain: true,
    contentType: "application/json; charset=utf-8",

    success: function () {
      $("#statustext").text("Success!");
      if (callback) callback();
    },

    error: function (err) {
      adminSubmitError(err);
      if (callback) callback();
    },
  });
}

function adminSubmitError(err) {
  if (err.status == 403) {
    $("#statustext").text("Error: you must be an admin to submit changes")
  }
  else {
    $("#statustext").text("Error: " + err.responseText)
  }
}
