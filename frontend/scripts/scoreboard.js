const scoreboard_api_url = "http://0.0.0.0:5000/scoreboard"
const competitions_api_url = "http://0.0.0.0:5000/competitions"

let index

$(document).ready(function() {
  $("#gobutton").on("click", changeCompetition)
  $("#yearsel").on("change", populateCompetitions)

  initScoreboardPage()
  
  $("#editbutton").on("click", function() {
    editMode()
  })
})


function initScoreboardPage() {
  const params = new URLSearchParams(window.location.search)

  // check query params first, then local storage for year/comp
  if (params.has("year") && params.has("cid")) {
    displayMode()
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
  $("#yearsel").show()
  $("#compsel").show()
  $("#rndinput").show()
  $("#yearlabel").show()
  $("#complabel").show()
  $("#rndlabel").show()
  $("#gobutton").show()

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
  $("#editbutton").show()
  $("#yearsel").hide()
  $("#compsel").hide()
  $("#rndinput").hide()
  $("#yearlabel").hide()
  $("#complabel").hide()
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

  queryData = {"year": year, "cid": cid}

  if (completedRounds !== "") {
    queryData["completed_rounds"] = completedRounds
  }

  $.ajax({
    method: "GET",
    url: scoreboard_api_url,
    data: queryData,
    crossDomain: true,
    success: function(result) {
      // {names: [], total_points: [], round_points: []}
      const numRounds = result.round_points[0].length
      const numPlayers = result.names.length

      // reconfigure results to allow sorting
      let leaders = []
      result.names.forEach((name, i) => {
	leaders.push({"name": name, "total": result.total_points[i], "round": result.round_points[i]})
      })

      leaders.sort((a, b) => ((a.total >= b.total) ? -1 : 1))

      // Table Header Contents
      let roundNames = []

      for (let i = numRounds; i > 0; i--) {
	switch (i) {
	  case 1:
	    roundNames.push("Championship");
	    break;
	  case 2:
	    roundNames.push("Final 4");
	    break;
	  case 3:
	    roundNames.push("Elite 8");
	    break;
	  case 4:
	    roundNames.push("Sweet 16");
	    break;
	  default:
	    roundNames.push("Rnd of " + 2 ** i)
	}
      }

      let table = document.getElementById("scoreboardtable")
      table.innerHTML = ""

      let tableRow = table.insertRow()
      let tableCell = document.createElement("th")

      tableRow.appendChild(tableCell)

      roundNames.forEach(rName => {
	tableCell = document.createElement("th")
	tableCell.textContent = rName
	tableRow.appendChild(tableCell)
      })

      tableCell = document.createElement("th")
      tableCell.textContent = "TOTAL"
      tableRow.appendChild(tableCell)

      let tablePlayer
      leaders.forEach(leader => {
	tableRow = table.insertRow()
	tableCell = tableRow.insertCell()
	tablePlayer = document.createElement("a")
	tablePlayer.textContent = leader.name
	tablePlayer.href = "/bracket.html?year=" + year + "&cid=" + cid + "&pid=" + leader.name
	tableCell.append(tablePlayer)

	leader.round.forEach(points => {
	  tableCell = tableRow.insertCell()
	  tableCell.textContent = points
	})

	tableCell = tableRow.insertCell()
	tableCell.textContent = leader.total
      })
    }
  })
}


