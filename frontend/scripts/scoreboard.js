const api_url = "http://0.0.0.0:5000/scoreboard"

$(document).ready(function() {
  $("#gobutton").on("click", populateScoreboard)
})

function populateScoreboard() {
  const year = $("#yearinput").val()
  const cid = $("#cidinput").val()
  const completedRounds = $("#rndinput").val()

  queryData = {"year": year, "cid": cid}

  if (completedRounds !== "") {
    queryData["completed_rounds"] = completedRounds
  }

  $.ajax({
    method: "GET",
    url: api_url,
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

      leaders.forEach(leader => {
	tableRow = table.insertRow()
	tableCell = tableRow.insertCell()
	tableCell.textContent = leader.name

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

