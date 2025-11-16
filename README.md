# React MSL Application

## Overview

This React application implements OAuth2/OIDC authentication using the ForgeRock JavaScript SDK. When the application starts, it automatically redirects users to the ForgeRock OpenAM login page for authentication.

**Key Features:**
- Automatic redirect to ForgeRock login page on app startup
- OAuth2/OIDC authentication with PKCE (Proof Key for Code Exchange) for security
- Protected routes that require authentication
- Automatic token management and refresh

## How It Works (Simple Explanation)

Think of this application like entering a secure building:

1. **You open the app** → The app immediately takes you to the ForgeRock login page
2. **You enter your username and password** → ForgeRock verifies your credentials
3. **You're granted access** → ForgeRock sends you back to the app with a special "access card" (token)
4. **You can now use the app** → The app recognizes you're authenticated and shows you the protected content

If you're already logged in (have a valid token), you'll go straight to the app without seeing the login page.

## Authentication Flow

### Step 1: Application Startup
When you run `npm start` and open the application:
- The app loads and checks if you're already authenticated
- If not authenticated, it immediately redirects you to the ForgeRock login page
- No button clicking required - the redirect happens automatically

### Step 2: User Authentication
- You see the ForgeRock login page in your browser
- Enter your username and password
- ForgeRock validates your credentials

### Step 3: Return to Application
- After successful authentication, ForgeRock redirects you back to the app
- The app receives an authorization code and exchanges it for access tokens
- Your user information is loaded (email, name, etc.)

### Step 4: Access Granted
- You're now authenticated and can access protected pages
- The app shows the welcome page with your user information

### Step 5: Logout
- Click logout to end your session
- All tokens are cleared
- You'll be redirected back to login on next access

## Application Structure

### Main Components

**`src/context/AuthContext.js`** - The authentication manager
- Handles all authentication logic
- Manages user login state
- Automatically redirects to ForgeRock on app start if not authenticated
- Processes the authentication callback from ForgeRock

**`src/config/forgerock.js`** - Configuration file
- Contains ForgeRock server settings (URL, client ID, redirect URI)
- Defines what information to request from ForgeRock (scopes)

**`src/components/ProtectedRoute.jsx`** - Route guard
- Protects certain pages that require authentication
- Redirects to login if you're not authenticated
- Validates your tokens before allowing access

**`src/pages/auth/LoginPage.js`** - Login page
- Shows a loading message while redirecting to ForgeRock
- Only displays if there's an error or special case

**`src/routes/index.js`** - Route definitions
- Defines which pages are public (`/login`, `/callback`)
- Defines which pages require authentication (`/`, `/homePage`)

## Installation & Setup

### Prerequisites
- Node.js installed on your machine
- Access to ForgeRock OpenAM server
- OAuth2 client configured in ForgeRock with:
  - Client ID
  - Redirect URI: `http://localhost:3000/callback`
  - PKCE enabled (recommended)
  - Scopes: `openid profile email`

### Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure ForgeRock Settings**
   
   Edit `src/config/forgerock.js` and update:
   - `clientId`: Your ForgeRock OAuth2 client ID
   - `redirectUri`: Must match ForgeRock configuration (`http://localhost:3000/callback`)
   - `baseUrl`: Your ForgeRock server URL
   - `realmPath`: Your ForgeRock realm path

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Access the Application**
   - Open `http://localhost:3000` in your browser
   - You'll be automatically redirected to ForgeRock login page
   - Enter your credentials to access the application

## Configuration

### ForgeRock Configuration File: `src/config/forgerock.js`

This file contains all the settings needed to connect to your ForgeRock server:

- **clientId**: Your OAuth2 client ID (e.g., `"reactClientPKCE"`)
- **redirectUri**: Where ForgeRock sends users after login (must be `http://localhost:3000/callback`)
- **scope**: What user information to request (e.g., `"openid profile email"`)
- **baseUrl**: Your ForgeRock server base URL
- **realmPath**: Your ForgeRock realm path

**Important:** The `redirectUri` in this file must exactly match what's configured in your ForgeRock server. Otherwise, authentication will fail.

## Routes

### Public Routes
- `/login` - Login page (automatically redirects to ForgeRock)
- `/callback` - OAuth callback handler (handled automatically)

### Protected Routes (Require Authentication)
- `/` - Welcome page
- `/homePage` - Welcome page (alias)

## Troubleshooting

### Common Issues

**1. Not redirecting to ForgeRock login**
- Check that `src/config/forgerock.js` has the correct configuration
- Verify your ForgeRock server is accessible
- Check browser console for error messages

**2. "Redirect URI mismatch" error**
- Ensure `redirectUri` in `src/config/forgerock.js` exactly matches ForgeRock configuration
- Must be: `http://localhost:3000/callback` (include `/callback`)

**3. Authentication succeeds but redirects back to login**
- Check browser console for errors
- Verify token storage is working (check browser's session storage)

**4. ForgeRock server not reachable**
- Verify the `baseUrl` in `src/config/forgerock.js` is correct
- Check network connectivity to ForgeRock server
- Ensure CORS is properly configured on ForgeRock server

## Security Features

- **PKCE**: Uses Proof Key for Code Exchange for enhanced security
- **Secure Token Storage**: Tokens stored in browser session storage
- **Automatic Token Refresh**: Tokens are refreshed automatically before expiration
- **CSRF Protection**: Uses state parameter to prevent cross-site request forgery
- **Protected Routes**: Unauthenticated users cannot access protected pages

## Development

### Available Scripts

- `npm start` - Start development server on `http://localhost:3000`
- `npm build` - Build production version
- `npm test` - Run tests

### How to Test

1. Start the app: `npm start`
2. Browser should automatically redirect to ForgeRock login
3. Enter valid credentials
4. You should be redirected back to the app and see the welcome page
5. Try accessing protected routes directly - should redirect to login if not authenticated
