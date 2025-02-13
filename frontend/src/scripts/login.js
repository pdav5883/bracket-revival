// auth.js
import { 
    CognitoIdentityProviderClient,
    SignUpCommand,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand 
} from "@aws-sdk/client-cognito-identity-provider";

import { initCommon } from "./shared.js"
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
$(function() {
    initCommon()
    // Show/Hide Forms
    $("#showSignin").on('click', (e) => {
        e.preventDefault();
        $("#signupForm").addClass('hidden');
        $("#signinForm").removeClass('hidden');
        clearMessages();
    });

    $("#showSignup").on('click', (e) => {
        e.preventDefault();
        $("#signinForm").addClass('hidden');
        $("#signupForm").removeClass('hidden');
        clearMessages();
    });

    // Initialize
    handleVerification();
    checkAuthStatus();
});

function clearMessages() {
    $("#signupMessage").addClass('hidden');
    $("#signinMessage").addClass('hidden');
    $("#signupMessage").text('');
    $("#signinMessage").text('');
}

// Sign Up
$("#signup").on("click", async (e) => {
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
        }
    ];

    try {
        const command = new SignUpCommand({
            ClientId: poolData.ClientId,
            Username: email,
            Password: 'dummy-password', // Not used in custom auth
            UserAttributes: userAttributes
        });

        const response = await client.send(command);
        
        $("#signupMessage").text('Success! Check your email for verification link.');
        $("#signupMessage").removeClass('error');
        $("#signupMessage").addClass('success');
        $("#signupMessage").removeClass('hidden');
    } catch (error) {
        $("#signupMessage").text(error.message);
        $("#signupMessage").addClass('error');
        $("#signupMessage").removeClass('success');
        $("#signupMessage").removeClass('hidden');
    }
});

// Sign In
$("#signin").on("click", async (e) => {
    e.preventDefault();
    const email = $("#signinEmail").val();

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
            $("#signinMessage").text('Check your email for verification link.');
            $("#signinMessage").removeClass('error');
            $("#signinMessage").addClass('success');
            $("#signinMessage").removeClass('hidden');
        } else if (response.AuthenticationResult) {
            // User is fully authenticated
            showProtectedContent();
        }
    } catch (error) {
        $("#signinMessage").text(error.message);
        $("#signinMessage").addClass('error');
        $("#signinMessage").removeClass('success');
        $("#signinMessage").removeClass('hidden');
    }
});

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
                localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken);
                localStorage.removeItem('cognitoSession'); // Clean up the session
                showProtectedContent();
            }
        } catch (error) {
            $("#signinMessage").text('Verification failed: ' + error.message);
            $("#signinMessage").addClass('error');
            $("#signinMessage").removeClass('hidden');
            $("#signinForm").removeClass('hidden');
        }
    }
}

// Replace userPool.getCurrentUser() with token-based auth
function isAuthenticated() {
    const accessToken = localStorage.getItem('accessToken');
    return !!accessToken;
}

// Update Sign Out
$("#signout").on("click", () => {
    localStorage.removeItem('accessToken');
    showSignInForm();
});

// Update Check Auth Status
function checkAuthStatus() {
    if (isAuthenticated()) {
        showProtectedContent();
    } else {
        showSignInForm();
    }
}

// UI Helpers
function showProtectedContent() {
    $("#signupForm").addClass('hidden');
    $("#signinForm").addClass('hidden');
    $("#protectedContent").removeClass('hidden');
}

function showSignInForm() {
    $("#protectedContent").addClass('hidden');
    $("#signupForm").addClass('hidden');
    $("#signinForm").removeClass('hidden');
}
