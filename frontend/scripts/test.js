const api_url = "http://0.0.0.0:5000/test"

// window.onload = initScoreboardPage
$(document).ready(function() {
  $("#gobutton").on("click", callTestGet)
})

function callTestGet() {
  const a = $("#textinput").val()

  $.ajax({
    method: "GET",
    url: api_url,
    data: {"a": a},
    crossDomain: true,
    success: function(res) {
      $("#textstatus").text(res["out"])
    }
  })
}

