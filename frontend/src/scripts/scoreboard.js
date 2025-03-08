import { API_URL } from "./constants.js" 
import { initIndexYears,
  populateCompetitions,
  initCommon,
  getRenderNames,
  initButtons,
  spinnerOn,
  spinnerOff
} from "./shared.js"
import $ from "jquery"

let index

$(function() { 
  initCommon()
  initButtons(["gobutton"])
  $("#gobutton").on("click", () => changeCompetition(undefined)) // undefined means no query params
  $("#yearsel").on("change", populateCompetitionsWrapper)

  initScoreboardPage()
})


function initScoreboardPage() {
  const queryParams = new URLSearchParams(window.location.search)

  initIndexYears(function(ind) {
    index = ind

    if (queryParams.has("year") && queryParams.has("cid")) {
      changeCompetition(queryParams)
    }
    // TODO deal with local storage from previous visit
  }, queryParams.get("year"), queryParams.get("cid"))
}


function populateCompetitionsWrapper() {
  populateCompetitions(index)
}


function changeCompetition(queryParams) {
  // Hide span, show div for loading state
  spinnerOn("gobutton")
  
  // Call populateScoreboard with callback to restore button state
  populateScoreboard(queryParams, function() {
    spinnerOff("gobutton")
    
  })
}


function populateScoreboard(queryParams, callback) {
  
  let params
  if (queryParams === undefined) {
    params = {
      year: $("#yearsel").val(),
      cid: $("#compsel").val(),
      rounds: $("#rndinput").val()
    }
  }
  else {
    params = Object.fromEntries(queryParams)
  }

  $.ajax({
    method: "GET",
    url: API_URL.scoreboard,
    data: params,
    crossDomain: true,
    success: function(result) {
      // {names: [], total_points: [], round_points: []}

      // reconfigure results to allow sorting
      let leaders = []

      result.rendernames = getRenderNames(result.names)
      result.rendernames.forEach((rname, i) => {
        leaders.push({"name": rname, "pid": result.names[i], "total": result.total_points[i], "round": result.round_render[i]})
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
        tablePlayer.href = "/bracket.html?year=" + params.year + "&cid=" + params.cid + "&pid=" + leader.pid
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

      // Call the callback if provided
      if (callback) callback()
    },
    error: function(err) {
      if (callback) callback()
    }
  })
}

const checkmark = "<svg xmlns='http://www.w3.org/2000/svg' height='18' width='18' viewBox='0 0 512 512'><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><circle fill='#888888' cy='256' cx='256' r='260'/><circle fill='#ffffff' cy='256' cx='256' r='200'/><path fill='#22bc20' d='M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z'/></svg>"

const waitmark = "<svg xmlns='http://www.w3.org/2000/svg' height='18' width='18' viewBox='0 0 512 512'><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><circle fill='#888888' cy='256' cx='256' r='260'/><circle fill='#ffffff' cy='256' cx='256' r='200'/><path fill='#22bc20' d='M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z'/></svg>"

