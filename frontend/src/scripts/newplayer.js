import { API_URL } from "./constants.js" 
import { initIndexYears, populateCompetitions } from "./shared.js"
import $ from "jquery"

let index

$(document).ready(function() {
  $.get("assets/nav.html", navbar => {
    $("#nav-placeholder").replaceWith(navbar)
  })
 
  $("#scoreboarddiv").hide()
  $("#submitbutton").on("click", submitNewPlayer)
  $("#yearsel").on("change", populateCompetitionsWrapper)

  initNewPlayerPage()
})


function initNewPlayerPage() {
  const params = new URLSearchParams(window.location.search)
  
  if (params.has("year") && params.has("compname")) {
    initSingleYearCompetition(params.get("year"), params.get("compname"))
  }
  else {
    initIndexYears(function(ind) {
      index = ind
    })
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


function populateCompetitionsWrapper() {
  populateCompetitions(index)
}


function submitNewPlayer() {
  // disable button until response received
  $("#statustext").text()
  $("#submitbutton").prop("disabled", true)

  // client validation
  const validateId = ["yearsel", "compsel", "nameinput", "emailinput"]
  let validationErr = false
  validateId.forEach(v => {
    if ($("#" + v).val() == "") {
      $("#" + v).addClass("is-invalid")
      validationErr = true
    }
    else {
      $("#" + v).addClass("is-valid")
    }
  })

  if (validationErr) {
    $("#statustext").text("Missing entries")
    $("#submitbutton").prop("disabled", false)
    return
  }

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

      $("#submitdiv").hide()
      $("#scoreboarddiv").show()
      $("#scoreboardbutton").attr("href", "/scoreboard.html?year=" + data.year + "&cid=" + data.compname)
    },
    failure: function() {
      $("#submitbutton").prop("disabled", false)
      $("#statustext").text("Server Error: TODO")
      // TODO: wait for deployment to test case where picks are locked for competition
    }
  }) 
}

