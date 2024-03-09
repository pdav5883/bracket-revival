import { API_URL } from "./constants.js" 
import { populateCompetitions } from "./shared.js"
import $ from "jquery"

let index

$(document).ready(function() {
  $.get("assets/nav.html", navbar => {
    $("#nav-placeholder").replaceWith(navbar)
  })

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
        leaders.push({"name": name, "total": result.total_points[i], "round": result.round_points[i]})
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

        leader.round.forEach(points => {
          tableCell = tableRow.insertCell()
          tableCell.textContent = points
          tableCell.classList.add("text-muted")
        })

      })
    }
  })
}


