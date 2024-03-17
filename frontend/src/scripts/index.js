import $ from "jquery"
import { API_URL } from "./constants.js" 
import { initIndexYears, populateCompetitions } from "./shared.js"

let index

$(document).ready(function() {
  $.get("assets/nav.html", navbar => {
    $("#nav-placeholder").replaceWith(navbar)
  })
  
  $("#gobutton").on("click", goToScoreboard)
  $("#yearsel").on("change", populateCompetitionsWrapper)
    

  initIndexYears(function(ind) {
    index = ind
  })
})

function populateCompetitionsWrapper() {
  populateCompetitions(index)
}


function goToScoreboard() {
  const year = $("#yearsel").val()
  const compName = $("#compsel").val()

  window.location = "/scoreboard.html?year=" + year + "&cid=" + compName
}

