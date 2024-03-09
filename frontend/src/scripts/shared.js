import { API_URL } from "./constants.js"
import "../styles/custom.css"
import $ from "jquery"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap"


export function initIndexYears(setIndexCallback) {
  // need the setIndexCallback argument to allow calling script to set index,
  // since returning from this function will happen before ajax query completes
  $.ajax({
    method: "GET",
    url: API_URL.competitions,
    data: {},
    crossDomain: true,
    success: function(index) {

      //populate years
      let yearOpt
      for (const year in index) {
        yearOpt = document.createElement("option")
        yearOpt.value = year
        yearOpt.textContent = year
        $("#yearsel").append(yearOpt)
      }

      // this must happen before .change() below, which requires index
      setIndexCallback(index)
      
      // set to latest year with change to populate competitions
      if (yearOpt !== undefined) {
        $("#yearsel").val(yearOpt.value).change()
      }
    }
  })
}


export function populateCompetitions(index) {
  $("#compsel").empty()

  let compOpt
  for (const compName in index[$("#yearsel").val()]) {
    compOpt = document.createElement("option")
    compOpt.value = compName
    compOpt.textContent = compName
    $("#compsel").append(compOpt)
  }

  // set to last competition
  if (compOpt !== undefined) {
    $("#compsel").val(compOpt.value).change()
  }
}


export function populatePlayerNames(index, emptyLabel) {
  $("#playersel").empty()

  let playerOpt
  for (const playerName of index[$("#yearsel").val()][$("#compsel").val()].players) {
    playerOpt = document.createElement("option")
    playerOpt.value = playerName
    playerOpt.textContent = playerName
    $("#playersel").append(playerOpt)
  }

  // can put empty option for "Results" in dropdown if arg is present
  if (emptyLabel !== undefined) {
    // Empty option
    playerOpt = document.createElement("option")
    playerOpt.value = ""
    playerOpt.textContent = emptyLabel
    $("#playersel").append(playerOpt)
  }

  // set to latest
  if (playerOpt !== undefined) {
    $("#playersel").val(playerOpt.value).change()
  }
}

