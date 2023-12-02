const api_url = "http://0.0.0.0:5000/start"

$(document).ready(function() {
  $("#gobutton").on("click", populateRoundStart)
})

function populateRoundStart() {
  const year = $("#yearinput").val()
  const cid = $("#cidinput").val()
  const startRound = $("#rndinput").val()

  queryData = {"year": year, "cid": cid, "round_start": startRound}

  $.ajax({
    method: "GET",
    url: api_url,
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
	    buildMatchup(tableRow.insertCell(), bracketCell)
	  }
	})
      })

    }
  })
}


function buildMatchup(tableCell, bracketCell) {
  tableCell.rowSpan = bracketCell.rowSpan
  let t0 = document.createElement("span")
  t0.textContent = bracketCell.teams[0] === null ? "---" : "#" + bracketCell.seeds[0] + " " + bracketCell.teams[0]
  let t1 = document.createElement("span")
  t1.textContent = bracketCell.teams[1] === null ? "---" : "#" + bracketCell.seeds[1] + " " + bracketCell.teams[1]

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
  for (i = 0; i < numRows; i++) {
    game = startGames[i]
    game["rowSpan"] = 1
    bracketArray[i][0] = game
  }

  let rnd
  for (rnd = 1; rnd < numCols; rnd++) {
    for (i = 0; i < numRows; i += 2 ** rnd) {
      game = {"teams": [null, null],
              "rowSpan": 2 ** rnd}
      bracketArray[i][rnd] = game
    }
  }
  return bracketArray
}

