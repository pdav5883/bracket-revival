import $ from "jquery"
import { API_URL } from "./constants.js" 
import { initIndexYears, populateCompetitions, initCommon } from "./shared.js"

let index

$(function() {
  initCommon()
  
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

