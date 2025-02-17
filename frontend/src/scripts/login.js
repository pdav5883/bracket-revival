// auth.js
import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand,
    GetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";

import { initCommon, isAuthenticated } from "./shared.js"
import $ from "jquery"

const poolData = {
    UserPoolId: 'us-east-1_7j2Ragbz6', // Replace with your User Pool ID
    ClientId: 'oe8k6bdnfaalq92ti8if2rcjp' // Replace with your Client ID
};

// Initialize the Cognito client
const client = new CognitoIdentityProviderClient({
    region: "us-east-1" // Your region
});

// Move all UI initialization into a DOMContentLoaded event listener
$(async function () {
    initCommon()
    // Show/Hide Forms
    $("#closeButton").hide()
    $("#signupForm").hide();
    $("#signinForm").hide();

    $("#closeButton").on('click', (e) => {
        e.preventDefault();
        window.close();
    });

    $("#showSignin").on('click', (e) => {
        e.preventDefault();
        $("#signupForm").hide();
        $("#signinForm").show();
        clearMessage();
    });

    $("#showSignup").on('click', (e) => {
        e.preventDefault();
        $("#signinForm").hide();
        $("#signupForm").show();
        clearMessage();
    });

    // Initialize
    await handleVerification();
    checkAuthStatus();
});

function clearMessage() {
    $("#loginMessage").hide();
    $("#loginMessage").text('');
}

// Sign Up
$("#signupButton").on("click", async (e) => {
    e.preventDefault();
    const email = $("#signupEmail").val();
    const firstName = $("#signupFirstName").val();
    const lastName = $("#signupLastName").val();

    const userAttributes = [
        {
            Name: 'email',
            Value: email
        },
        {
            Name: 'given_name',
            Value: firstName
        },
        {
            Name: 'family_name',
            Value: lastName
        },
        {
            Name: "name",
            Value: `${firstName}-${lastName}`.toLowerCase().replace(' ', '')
        }
    ];

    try {
        const command = new SignUpCommand({
            ClientId: poolData.ClientId,
            Username: email,
            Password: 'dummy-password', // Not used in custom auth
            UserAttributes: userAttributes
        });

        await client.send(command);

        await startAuthFlow(email);

        $("#closeButton").show();
        $("#signinForm").hide()
        $("#loginMessage").text('Check your email for verification link.');
        $("#loginMessage").removeClass('error');
        $("#loginMessage").show();
    } catch (error) {
        $("#loginMessage").text(error.message);
        $("#loginMessage").addClass('error');
        $("#loginMessage").show();
    }
});

// Sign In
$("#signinButton").on("click", async (e) => {
    e.preventDefault();

    const email = $("#signinEmail").val();
    await startAuthFlow(email);
});

async function startAuthFlow(email) {

    try {
        const command = new InitiateAuthCommand({
            AuthFlow: 'CUSTOM_AUTH',
            ClientId: poolData.ClientId,
            AuthParameters: {
                'USERNAME': email
            }
        });

        const response = await client.send(command);

        if (response.ChallengeName === 'CUSTOM_CHALLENGE') {
            // Store the session for later use
            localStorage.setItem('cognitoSession', response.Session);
            $("#closeButton").show();
            $("#signinForm").hide()
            $("#signupForm").hide()
            $("#loginMessage").text('Check your email for verification link.');
            $("#loginMessage").removeClass('error');
            $("#loginMessage").show();
        } else if (response.AuthenticationResult) {
            // User is fully authenticated
            localStorage.setItem('blr-accessToken', response.AuthenticationResult.AccessToken);
            localStorage.removeItem('cognitoSession'); // Clean up the session
            const attributes = await getUserAttributes();
            localStorage.setItem('blr-userFirstName', attributes.given_name);
            localStorage.setItem('blr-userLastName', attributes.family_name);
            localStorage.setItem('blr-isAdmin', attributes['custom:is_admin'] === 'true');
            goHome()
        }
    } catch (error) {
        $("#loginMessage").text(error.message);
        $("#loginMessage").addClass('error');
        $("#loginMessage").show();
    }
}

// Handle verification from email link
async function handleVerification() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const email = urlParams.get('email');

    if (code && email) {
        try {
            // Retrieve the session from localStorage
            const session = localStorage.getItem('cognitoSession');
            if (!session) {
                throw new Error('No session found. Please try signing in again.');
            }

            const command = new RespondToAuthChallengeCommand({
                ClientId: poolData.ClientId,
                ChallengeName: 'CUSTOM_CHALLENGE',
                Session: session,  // Use the stored session
                ChallengeResponses: {
                    'ANSWER': code,
                    'USERNAME': email
                }
            });

            const response = await client.send(command);

            if (response.AuthenticationResult) {
                localStorage.setItem('blr-accessToken', response.AuthenticationResult.AccessToken);
                localStorage.removeItem('cognitoSession'); // Clean up the session
                const attributes = await getUserAttributes();
                localStorage.setItem('blr-userFirstName', attributes.given_name);
                localStorage.setItem('blr-userLastName', attributes.family_name);
                localStorage.setItem('blr-isAdmin', attributes['custom:is_admin'] === 'true');
                goHome()
            }
        } catch (error) {
            $("#loginMessage").text('Verification failed: ' + error.message);
            $("#loginMessage").addClass('error');
            $("#loginMessage").show();
            $("#signinForm").show();
        }
    }
}


async function getUserAttributes() {
    try {
        const accessToken = localStorage.getItem('blr-accessToken');
        if (!accessToken) {
            throw new Error('Not authenticated');
        }

        const command = new GetUserCommand({
            AccessToken: accessToken
        });

        const response = await client.send(command);
        
        // Convert attributes array to an easy-to-use object
        const attributes = {};
        response.UserAttributes.forEach(attr => {
            attributes[attr.Name] = attr.Value;
        });

        // Now you can access attributes.given_name, attributes.family_name, etc.
        return attributes;
    } catch (error) {
        console.error('Error getting user attributes:', error);
        throw error;
    }
}


// Update Check Auth Status
function checkAuthStatus() {
    if (isAuthenticated()) {
        goHome()
    } else {
        showSignUpForm();
    }
}

function showSignInForm() {
    $("#signupForm").hide();
    $("#signinForm").show();
}

function showSignUpForm() {
    $("#signupForm").show();
    $("#signinForm").hide();
}

function goHome() {
    window.location.href = '/';
}
