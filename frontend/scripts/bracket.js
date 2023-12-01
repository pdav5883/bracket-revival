const api_url = "http://0.0.0.0:5000/bracket"

$(document).ready(function() {
  $("#gobutton").on("click", populateBracket)
})

function populateBracket() {
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
    success: function(gamesNested) {
      // game: {teams: [], seeds: [], score: [], result: 0/1}
      // teams/seeds/score=[null, null], result=null
      let table = document.getElementById("brackettable")
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


function buildMatchup(tableCell, bracketCell) {
  tableCell.rowSpan = bracketCell.rowSpan
  let t0 = document.createElement("span")
  t0.textContent = bracketCell.teams[0] === null ? "---" : bracketCell.teams[0]
  let t1 = document.createElement("span")
  t1.textContent = bracketCell.teams[1] === null ? "---" : bracketCell.teams[1]

  if (bracketCell.result == 0) {
    t0.classList.add("winnerspan")
  }
  else if (bracketCell.result == 1) {
    t1.classList.add("winnerspan")
  }

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
  let rowSpan

  for (rnd = 0; rnd < gamesNested.length; rnd++) {
    for (i = 0; i < gamesNested[rnd].length; i++) {
      game = gamesNested[rnd][i]
      game["rowSpan"] = 2 ** rnd

      bracketArray[i * (2 ** rnd)][rnd] = game
    }
  }
  return bracketArray
}

