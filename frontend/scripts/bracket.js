const api_url = "http://0.0.0.0:5000/bracket"

$(document).ready(function() {
  $("#gobutton").on("click", populateBracket)
})

function populateBracket() {
  const year = $("#yearinput").val()
  const cid = $("#cidinput").val()

  $.ajax({
    method: "GET",
    url: api_url,
    data: {"year": year, "cid": cid},
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
	    let tableCell = tableRow.insertCell()
	    tableCell.rowSpan = bracketCell.rowSpan
	    tableCell.innerText = bracketCell.teams[0] + " vs " + bracketCell.teams[1]
	  }
	})
      })

    }
  })
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

