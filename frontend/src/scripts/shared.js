import { API_URL } from "./constants.js"
import "../styles/custom.css"
import $ from "jquery"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap"

import { InitiateAuthCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

const poolData = {
  UserPoolId: 'us-east-1_7j2Ragbz6', // Replace with your User Pool ID
  ClientId: 'oe8k6bdnfaalq92ti8if2rcjp' // Replace with your Client ID
};

const client = new CognitoIdentityProviderClient({
  region: "us-east-1" // Your region
});

// Common init of navbar
export function initCommon() {
  $(function() {
    $.get("assets/nav.html", navbar => {
      $("#nav-placeholder").replaceWith(navbar);
      
      // Determine whether to show signin button or user menu
      if (isAuthenticated()) {
        $("#signin-button").hide();
        $("#user-menu").show();
        const userFirstName = localStorage.getItem('blr-userFirstName');
        const userLastName = localStorage.getItem('blr-userLastName');
        const isAdmin = localStorage.getItem('blr-isAdmin') === 'true';
        $("#user-menu").text(`${userFirstName} ${userLastName[0]}`);

        if (isAdmin) {
          $("#admin-button").show();
        } else {
          $("#admin-button").hide();
        }
      }

      else {
        $("#signin-button").show();
        $("#user-menu").hide();
      }
      
      $("#signout-button").on("click", signOut);

      $("#signin-button").on("click", async () => {
        if (localStorage.getItem('blr-testing') === 'true') {
          localStorage.setItem('blr-accessToken', '');
          localStorage.setItem('blr-refreshToken', 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.q2Q9YC_o7hys8yPYxk9WAk8WdimnfxctYUt_PQgPXB-OFQhX-vtb72QeomsiQFe6icbWtAJSBeBk8jyl9EmRl_Jn4tGU_PhksinXvt48GDC0-aOPMhqSJIeHvOPXABXnH-jGrcG5ZaA1zNIrPJONo2Hr9HRVKn-Q3zXdP1VnAiclhxeYV58hxfsN1N_9h0e7C2_b0M3FBSHykrRtusTSchLtgryED6aKe-8UXfSVfedD2v32hm-K1egcS_kt7iKcXGqhJK-NsWgPNgCFQ4hqud8rVys5M6oFlZYmYhScN1LRBK9wQ0mnSq_hV_DSp-Z2Zah1Cu1mn5Akby3TTnrXEA.T0SYQrCYD_mW9wlR.-XxUgPVC1iParxXW-q1GvTftXnIM0j-2gsoGbG-bNR55bfk-AvoRaHtahgi_Gc4WE6Td3Y8c2m7aFObGSlYLGvnp7Gj29JbiV_AEmKzXqP-efSOYBCmu7c-NkN8SQfP1tWQT-iga6hAXSJ8wObo7NdC9igamQ6bt1cm-KJXWPfQaA7a3OuaSmY1BVNFjkUcPk06uxqLw3xBD37hCK65donhQYFwpkotmFvbO6g3w27Pa4ZikJGBuwaanLCQ_ZnZx8599DBWxfFK2NHlBT4lt287mcpyxjR8-FrcH4BDgN0w9Vef9LVJmSq-kI2yAzlVX9PWDzQClayfNht-sXm1eSTsn3E2UnJh7JNdzvuP3fVsdBPzxRejqo3ig3mRJggJxsIcdd3I753SAi_NbOHt85iuMgRVjTi6ba5GX6DJzzDySAQ-VLpZc_TFAcoXu_9ube-2wUZUv-7zNC4YVWCtSW11BV61EpEN61mGlT1ahgqmFNFHatlcKEZNC5WUDI9kRkiKO3piVX6nLrArn5zcYs8_xqXLHYoL6ux9fXMWTTJfYbFQdPfBZxIyK33FAmyxsKf6sTq3ds-rQiRYV4phWffjum5-sgmZRRSdYLwW0I5d5J6L9d0LrqfMqvHrfQsQkYtHRoJ6MLfUJKY5CBdv6GYhSSgpCnp-4dwxYqZKsblRdlsviUXtLtfrrsb-fILrEnVivUf_a-YnqP01OVwOWdeHsef8TSl_5MvCSoEHORb1Yxa5VZ9Ui0zooZbCWFAF-IliQULFXGuVRL49njPeT-YVoLfa5Tk88lII3MkFm59dKH8h0Z8hUxGsu8R5XZ1Vo0NFybPYAWLXEYFU4QRyYALo-bKwGW-9FNuL9-LSeQ9ltNO8IezMtIW2n6JhlISGEYIu5WBddjzYIGcTUmTAfPayrHR1XKyXA_uNR2v1WVB4P84Ef6lZmHJSzVMM-3UAH9e2aRZeENcC4eM00kaqbVgDMtwVU0HJwGWEnsNKWghnxdQDokM3EP15UzrJeOZ6iApFbvGvDC8-hSh0VfZpKCAB-cwr53co85cB0fFDuPwVuPUSA6xrKH4Xk-rACNq9hurQiB0lTZrFU14W3s8-qcwE6htjyyMh1qiDIG_zUfJEfCnCvi8rE6_KA510FjlOjgDyoLMLKsioAdeM2syyeYxEOM9ko3nFx3D1n6NavhEPmnaNfHgs9Sq9gn9tvFjGiMsWv-YKA562I8jSn40JM8tYBo9jJ9bt1zKo7XFGC9rJHNyDlz04RTiyQxuNpU-Pi8HpIqpQnzWYopPKr2eWG5z2yOWSlKvb-Q6Ylz57GMCbKkjOoETyf8DYDY6ry.BEABfSQHuK6G6nlEV4qhQw');
          localStorage.setItem('blr-tokenExpiration', '1640625599886');
          localStorage.setItem('blr-userFirstName', 'Test');
          localStorage.setItem('blr-userLastName', 'User');
          localStorage.setItem('blr-isAdmin', 'false');
          await getValidAccessToken();       
        }
        else {
          window.location.href = '/login.html';
        }
      });

      $("#admin-button").on("click", () => {
        window.location.href = '/admin.html';
      });
    });
  });
}

export function initIndexOnly(setIndexCallback) {
  // need the setIndexCallback argument to allow calling script to set index,
  // since returning from this function will happen before ajax query completes
  $.ajax({
    method: "GET",
    url: API_URL.competitions,
    data: {},
    crossDomain: true,
    success: function(index) {

      // this must happen before .change() below, which requires index
      setIndexCallback(index)
    }
  })
}

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
  const playerNames = index[$("#yearsel").val()][$("#compsel").val()].players
  const renderNames = getRenderNames(playerNames)

  for (let i = 0; i < playerNames.length; i++) {
    playerOpt = document.createElement("option")
    playerOpt.value = playerNames[i]
    playerOpt.textContent = renderNames[i]
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

// Add this new function to handle refresh
async function refreshToken() {
  try {
      const command = new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: poolData.ClientId,
          AuthParameters: {
              'REFRESH_TOKEN': localStorage.getItem('blr-refreshToken')
          }
      });

      const response = await client.send(command);
      
      if (response.AuthenticationResult) {
          localStorage.setItem('blr-accessToken', response.AuthenticationResult.AccessToken);
          localStorage.setItem('blr-tokenExpiration', Date.now() + (response.AuthenticationResult.ExpiresIn * 1000));
          return response.AuthenticationResult.AccessToken;
      }
  } catch (error) {
      console.error('Error refreshing token:', error);
      // If refresh fails, sign out user
      signOut();
      return ""
  }
}

// Add this function to check and refresh token when needed
export async function getValidAccessToken() {
  const expiration = localStorage.getItem('blr-tokenExpiration');

  if (expiration === null) {
    console.error('User is not logged in.')
    signOut();
    return ""
  }
  
  const currentTime = Date.now();
  
  if (expiration && currentTime >= expiration - 60000) { // Refresh if within 1 minute of expiration
      return await refreshToken();
  }
  else {
    return localStorage.getItem('blr-accessToken');
  }
}

export function signOut() {
  // Update Sign Out
  localStorage.removeItem('blr-accessToken');
  localStorage.removeItem('blr-refreshToken');
  localStorage.removeItem('blr-tokenExpiration');
  localStorage.removeItem('blr-userFirstName');
  localStorage.removeItem('blr-userLastName');
  localStorage.removeItem('blr-isAdmin');

  $("#signin-button").show();
  $("#user-menu").hide();
}

export function isAuthenticated() {
  const accessToken = localStorage.getItem('blr-accessToken');
  return !!accessToken;
}

export function getRenderNames(names) {
  const renderNames = names.map(name => name.split(" ")[0]);
  const lastNames = names.map(name => " " + name.split(" ")[1]);

  for (let i = 0; i < renderNames.length; i++) {
    let nameOk = false

    while (!nameOk) {
      nameOk = true
      let origName = renderNames[i]
      for (let j = 0; j < renderNames.length; j++) {
        if (i == j) {
          continue
        }

        if (origName == renderNames[j]) {
          if (nameOk) {
            renderNames[i] = origName + lastNames[i][0]
            lastNames[i] = lastNames[i].substring(1)
            nameOk = false
          }

          renderNames[j] = origName + lastNames[j][0]
          lastNames[j] = lastNames[j].substring(1)
        }
      }
    }
  }
  return renderNames;
}
