import { API_URL } from "./constants.js" 
import $ from "jquery"

let index

$(document).ready(function() {
  $.get("assets/nav.html", navbar => {
    $("#nav-placeholder").replaceWith(navbar)
  })
  
  $("#submitbutton").on("click", submitNewPlayer)
  $("#yearsel").on("change", populateCompetitions)

  initNewPlayerPage()
})


function initNewPlayerPage() {
  const params = new URLSearchParams(window.location.search)
  
  if (params.has("year") && params.has("compname")) {
    initSingleYearCompetition(params.get("year"), params.get("compname"))
  }
  else {
    initAllYearsCompetitions()
  }
}


function initSingleYearCompetition(year, compName) {
  let opt = document.createElement("option")
  opt.value = year
  opt.textContent = year
  $("#yearsel").append(opt)
  $("#yearsel").val(year)

  opt = document.createElement("option")
  opt.value = compName
  opt.textContent = compName
  $("#compsel").append(opt)
  $("#compsel").val(compName)
}


function initAllYearsCompetitions() {
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


function submitNewPlayer() {
  // disable button until response received
  $("#statustext").text()
  $("#submitbutton").prop("disabled", true)

  // client validation - TODO

  const data = {"type": "player",
    "year": $("#yearsel").val(),
    "compname": $("#compsel").val(),
    "playername": $("#nameinput").val(),
    "playeremail": $("#emailinput").val()
  }

  $.ajax({
    method: "PUT",
    url: API_URL.add,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(data),
    crossDomain: true,
    success: function() {
      $("#submitbutton").prop("disabled", false)
      $("#statustext").text("Success! Check your email to make picks.")
    },
    failure: function() {
      $("#submitbutton").prop("disabled", false)
      $("#statustext").text("Server Error: TODO")
    }
  }) 
}

