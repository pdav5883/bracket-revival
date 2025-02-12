// auth.js
import { 
    CognitoIdentityProviderClient,
    SignUpCommand,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand 
} from "@aws-sdk/client-cognito-identity-provider";

const poolData = {
    UserPoolId: 'us-east-1_7j2Ragbz6', // Replace with your User Pool ID
    ClientId: 'oe8k6bdnfaalq92ti8if2rcjp' // Replace with your Client ID
};

// Initialize the Cognito client
const client = new CognitoIdentityProviderClient({ 
    region: "us-east-1" // Your region
});

// UI Elements
const signupForm = document.getElementById('signupForm');
const signinForm = document.getElementById('signinForm');
const protectedContent = document.getElementById('protectedContent');
const showSigninLink = document.getElementById('showSignin');
const showSignupLink = document.getElementById('showSignup');
const signupMessage = document.getElementById('signupMessage');
const signinMessage = document.getElementById('signinMessage');

// Move all UI initialization into a DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Show/Hide Forms
    showSigninLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        signinForm.classList.remove('hidden');
        clearMessages();
    });

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        signinForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        clearMessages();
    });

    // Initialize
    handleVerification();
    checkAuthStatus();
});

function clearMessages() {
    signupMessage.classList.add('hidden');
    signinMessage.classList.add('hidden');
    signupMessage.textContent = '';
    signinMessage.textContent = '';
}

// Sign Up
document.getElementById('signup').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const firstName = document.getElementById('signupFirstName').value;
    const lastName = document.getElementById('signupLastName').value;

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
        
        signupMessage.textContent = 'Success! Check your email for verification link.';
        signupMessage.classList.remove('error');
        signupMessage.classList.add('success');
        signupMessage.classList.remove('hidden');
    } catch (error) {
        signupMessage.textContent = error.message;
        signupMessage.classList.add('error');
        signupMessage.classList.remove('success');
        signupMessage.classList.remove('hidden');
    }
});

// Sign In
document.getElementById('signin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value;

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
            signinMessage.textContent = 'Check your email for verification link.';
            signinMessage.classList.remove('error');
            signinMessage.classList.add('success');
            signinMessage.classList.remove('hidden');
        } else if (response.AuthenticationResult) {
            // User is fully authenticated
            showProtectedContent();
        }
    } catch (error) {
        signinMessage.textContent = error.message;
        signinMessage.classList.add('error');
        signinMessage.classList.remove('success');
        signinMessage.classList.remove('hidden');
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
            signinMessage.textContent = 'Verification failed: ' + error.message;
            signinMessage.classList.add('error');
            signinMessage.classList.remove('hidden');
            signinForm.classList.remove('hidden');
        }
    }
}

// Replace userPool.getCurrentUser() with token-based auth
function isAuthenticated() {
    const accessToken = localStorage.getItem('accessToken');
    return !!accessToken;
}

// Update Sign Out
document.getElementById('signout').addEventListener('click', () => {
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
    signupForm.classList.add('hidden');
    signinForm.classList.add('hidden');
    protectedContent.classList.remove('hidden');
}

function showSignInForm() {
    protectedContent.classList.add('hidden');
    signupForm.classList.add('hidden');
    signinForm.classList.remove('hidden');
}
