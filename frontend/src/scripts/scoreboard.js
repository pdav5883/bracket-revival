import { API_URL } from "./constants.js" 
import { initIndexYears, populateCompetitions, initCommon } from "./shared.js"
import $ from "jquery"

let index

$(function() { 
  initCommon()

  $("#gobutton").on("click", changeCompetition)
  $("#yearsel").on("change", populateCompetitionsWrapper)

  initScoreboardPage()
  
  $("#editbutton").on("click", function() {
    editMode()
  })
})


function initScoreboardPage() {
  const params = new URLSearchParams(window.location.search)

  // check query params first, then local storage for year/comp
  if (params.has("year") && params.has("cid")) {
    displayMode(params.get("year"), params.get("cid"))
    populateScoreboard({"year": params.get("year"),
      "cid": params.get("cid"),
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
  $("#yeardisplay").hide()
  $("#compdisplay").hide()
  $("#yearsel").show()
  $("#compsel").show()
  $("#yearlabel").show()
  $("#complabel").show()
  $("#gobutton").show()
  $("#buttondiv").removeClass("align-items-center")
  $("#buttondiv").addClass("align-items-end")

  // first time we populate selects, call backend
  if (index === undefined) {
    initIndexYears(function(ind) {
      index = ind
    })
  }
}


function displayMode(year, cid) {
  $("#editbutton").show()
  $("#yeardisplay").show()
  $("#compdisplay").show()
  $("#yearsel").hide()
  $("#compsel").hide()
  $("#yearlabel").hide()
  $("#complabel").hide()
  $("#gobutton").hide()
  $("#buttondiv").removeClass("align-items-end")
  $("#buttondiv").addClass("align-items-center")

  $("#yearinsert").text(year)
  $("#compinsert").text(cid)
}


function populateCompetitionsWrapper() {
  populateCompetitions(index)
}


function changeCompetition() {
  // nests within function to avoid passing click arg to populateScoreboard
  populateScoreboard()
}


function populateScoreboard(args) {
  let year
  let cid
  let completedRounds

  if (args === undefined) {
    year = $("#yearsel").val()
    cid = $("#compsel").val()
    completedRounds = $("#rndinput").val()
  }

  else {
    year = args.year
    cid = args.cid
    completedRounds = args.completedRounds
  }

  const queryData = {"year": year, "cid": cid}

  if (completedRounds !== "") {
    queryData["completed_rounds"] = completedRounds
  }

  $.ajax({
    method: "GET",
    url: API_URL.scoreboard,
    data: queryData,
    crossDomain: true,
    success: function(result) {
      // {names: [], total_points: [], round_points: []}

      // reconfigure results to allow sorting
      let leaders = []
      result.names.forEach((name, i) => {
        leaders.push({"name": name, "total": result.total_points[i], "round": result.round_render[i]})
      })

      leaders.sort((a, b) => ((a.total >= b.total) ? -1 : 1))

      // add rank
      if (leaders.length > 0) {
        leaders[0].rank = 1
        for (let i = 1; i < leaders.length; i++) {
          if (leaders[i].total < leaders[i - 1].total) {
            leaders[i].rank = leaders[i - 1].rank + 1
          }
          else {
            leaders[i].rank = leaders[i - 1].rank
          }
        }
      }

      // Table Header Contents
      let colLabels = [
        "Rank",
        "Name",
        "Score",
        "R1",
        "R2",
        "S16",
        "E8",
        "F4",
        "CH"
      ]

      let table = document.getElementById("scoreboardtable")
      table.innerHTML = ""
      let tableRow = table.insertRow()
      let tableCell

      colLabels.forEach(cLab => {
        tableCell = document.createElement("th")
        tableCell.textContent = cLab
        tableRow.appendChild(tableCell)
      })

      let tablePlayer
      leaders.forEach(leader => {
        tableRow = table.insertRow()
        tableCell = document.createElement("th")
        tableCell.textContent = leader.rank
        tableRow.appendChild(tableCell)

        tableCell = tableRow.insertCell()
        tablePlayer = document.createElement("a")
        tablePlayer.classList.add("text-decoration-none")
        tablePlayer.textContent = leader.name
        tablePlayer.href = "/bracket.html?year=" + year + "&cid=" + cid + "&pid=" + leader.name
        tableCell.append(tablePlayer)

        tableCell = tableRow.insertCell()
        tableCell.textContent = leader.total

        leader.round.forEach(render => {
          tableCell = tableRow.insertCell()
          if (render === true) {
            tableCell.innerHTML = checkmark
          }
          else if (render === false) {
            tableCell.innerHTML = waitmark
          }
          else {
            tableCell.textContent = render 
            tableCell.classList.add("text-muted")
          }
        })

      })
    }
  })
}

const checkmark = "<svg xmlns='http://www.w3.org/2000/svg' height='18' width='18' viewBox='0 0 512 512'><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><circle fill='#888888' cy='256' cx='256' r='260'/><circle fill='#ffffff' cy='256' cx='256' r='200'/><path fill='#22bc20' d='M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z'/></svg>"

const waitmark = "<svg xmlns='http://www.w3.org/2000/svg' height='18' width='18' viewBox='0 0 512 512'><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><circle fill='#888888' cy='256' cx='256' r='260'/><circle fill='#ffffff' cy='256' cx='256' r='200'/><path fill='#22bc20' d='M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z'/></svg>"

