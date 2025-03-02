import { API_URL } from "./constants.js" 

import { initIndexOnly,
  initIndexYears,
  populateCompetitions,
  initCommon,
  isAuthenticated,
  signOut,
  getValidAccessToken } from "./shared.js"

  import $ from "jquery"

let index

$(function() { 
  initCommon()
 
  $("#submitbutton").on("click", submitNewPlayer)

  $("#gobutton").on("click", () => {
    $("#statustext").text("")
    initSingleYearCompetition($("#yearsel").val(), $("#compsel").val())
  })

  $("#guestbutton").on("click", () => {
    $("#namediv").show()
    $("#notsignedindiv").hide()
    $("#submitbutton").show()
  })

  $("#newplayer-signinbutton").on("click", () => {
    const year = $("#yearsel").val();
    const compname = $("#compsel").val();
    const currentUrl = encodeURIComponent(window.location.pathname + `?year=${year}&compname=${compname}`);
    window.location.href = `/login.html?redirectUrl=${currentUrl}`;
  })

  $("#signoutlink").on("click", () => {
    signOut()
    initSingleYearCompetition($("#yearsel").val(), $("#compsel").val())
  })

  $("#yearsel").on("change", populateCompetitionsWrapper)

  const params = new URLSearchParams(window.location.search)

  $("#signedindiv").hide()
  $("#notsignedindiv").hide()
  $("#namediv").hide()
  $("#successdiv").hide()
  $("#submitbutton").hide()
  $('#gobutton').hide()
  $("#statustext").text("")
  
  if (params.has("year") && params.has("compname")) {
    const year = params.get("year")
    const compName = params.get("compname")

    initIndexOnly(function(ind) {
      index = ind
      
      handleQueryParams(year, compName)
      initSingleYearCompetition(year, compName)
    })
  }
  else {
    $('#gobutton').show()
    initIndexYears(function(ind) {
      index = ind
    })
  }
})


function handleQueryParams(year, compName) {
  // if year and compName are in params, populate dropdowns just with those if valid
  if (!Object.hasOwn(index, year) || !Object.hasOwn(index[year], compName)) {
    $("#statustext").text("Invalid URL with year " + year + " and competition " + compName)
    return
  }

  // Create and append year option
  $("<option>")
    .val(year)
    .text(year)
    .appendTo("#yearsel")
  $("#yearsel").val(year)

  // Create and append competition option
  $("<option>")
    .val(compName)
    .text(compName)
    .appendTo("#compsel")
  $("#compsel").val(compName)
}

function initSingleYearCompetition(year, compName) {

  $("#signedindiv").hide()
  $("#notsignedindiv").hide()
  $("#namediv").hide()
  $("#successdiv").hide()
  $("#submitbutton").hide()

  $('#firstnameinput').val('').prop("readonly", false)
  $('#lastnameinput').val('').prop("readonly", false)
  
  // check if this game is accepting players
  if (!index[year][compName].open_players) {
    $("#statustext").text("This game is not accepting players")
    return
  }

  // check if user is signed in
  if(isAuthenticated()) {
    $('#firstnameinput').val(localStorage.getItem('blr-userFirstName')).prop("readonly", true)
    $('#lastnameinput').val(localStorage.getItem('blr-userLastName')).prop("readonly", true)
    $("#namediv").show()
    $("#signedindiv").show()
    $('#submitbutton').show()
    return
  }

  else {
    $("#notsignedindiv").show()

    if (index[year][compName].allow_guests === false) {
      $("#guestbutton").hide()
    }
    else {
      $("#guestbutton").show()
    }
    return
  }
}


function populateCompetitionsWrapper() {
  populateCompetitions(index)
}


function submitNewPlayer() {
  // disable button until response received
  $("#statustext").text("")
  $("#submitbutton").prop("disabled", true)

  // client validation
  let validateId = ["yearsel", "compsel", "firstnameinput", "lastnameinput"]

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

  const queryParams = new URLSearchParams({
    type: "player",
    year: $("#yearsel").val(),
    compname: $("#compsel").val(),
    playerfirst: $("#firstnameinput").val(),
    playerlast: $("#lastnameinput").val()
  }).toString()

  $.ajax({
    method: "PUT",
    url: API_URL.add,
    headers: {
      "authorization": getValidAccessToken()
    },
    params: queryParams,
    crossDomain: true,
    success: function() {
      $("#submitbutton").prop("disabled", false)

      if (index[data.year][data.compname].require_secret === false) {
        $("#statustext").text("Success! Visit the picks page to pick your brackets.")
        $("#submitdiv").hide()
        $("#successdiv").show()
        $("#successbutton").attr("href", "/picks.html?year=" + data.year + "&cid=" + data.compname + "&pid=" + data.playername)
        $("#successbutton").text("Go To Picks")
      }
      else {
        $("#statustext").text("Success! Check your email to make picks.")
        $("#submitdiv").hide()
        $("#successdiv").show()
        $("#successbutton").attr("href", "/scoreboard.html?year=" + data.year + "&cid=" + data.compname)
        $("#successbutton").text("Go To Scoreboard")
      }

    },
    error: function(err) {
      $("#submitbutton").prop("disabled", false)
      $("#statustext").text(err.responseText)
    }
  }) 
}

