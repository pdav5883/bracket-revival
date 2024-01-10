const api_url = "http://0.0.0.0:5000/bracket"

$(document).ready(function() {
  $("#gobutton").on("click", populateBracket)
})

function populateBracket() {
  const year = $("#yearinput").val()
  const cid = $("#cidinput").val()
  const pid = $("#pidinput").val()
  const completedRounds = $("#rndinput").val()

  queryData = {"year": year, "cid": cid}

  if (completedRounds !== "") {
    queryData["completed_rounds"] = completedRounds
  }
  if (pid !== "") {
    queryData["pid"] = pid 
  }

  $.ajax({
    method: "GET",
    url: api_url,
    data: queryData,
    crossDomain: true,
    success: function(result) {
      // game: {teams: [], seeds: [], score: [], result: 0/1}
      // teams/seeds/score=[null, null], result=null
      let gamesNested = result.games
      let champion = result.champion

      let table = document.getElementById("brackettable")
      table.innerHTML = ""

      bracketArray = buildBracketArray(gamesNested, champion)

      bracketArray.forEach(bracketRow => {
	let tableRow = table.insertRow()
	bracketRow.forEach(bracketCell => {
	  if (bracketCell !== null) {
	    if (bracketCell.champion) {
	      buildChampion(tableRow.insertCell(), bracketCell)
	    }
	    else {
	      buildMatchup(tableRow.insertCell(), bracketCell)
	    }
	  }
	})
      })

    }
  })
}


function buildChampion(tableCell, bracketCell) {
  tableCell.rowSpan = bracketCell.rowSpan
  let t = document.createElement("span")
  t.textContent = bracketCell.team === null ? "---" : "#" + bracketCell.seed + " " + bracketCell.team
  t.classList.add("winnerspan")

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

