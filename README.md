# Vote Saarthi

Vote Saarthi is a web application built to assist Indian voters in navigating the election process. It provides information on polling booths, voting procedures, and includes a secure voting simulation.

## Chosen Vertical

**Election Process Assistant**
This application functions as a guide for voters, outlining the election process and timelines. It aims to make election information accessible and easy to understand.

## Approach and Logic

The project emphasizes security, accessibility, and lightweight performance.

*   **Architecture:** The application relies on a Node.js + Express backend and a Vanilla HTML/CSS/JS frontend. This approach keeps the repository size small and minimizes external dependencies.
*   **Security (E2E Encryption):** The voting simulation uses the Web Crypto API to provide Hybrid Encryption. The frontend generates an AES-GCM key to encrypt the vote payload, and then encrypts this AES key using the server's RSA-OAEP public key. This ensures the vote data remains encrypted in transit and can only be decrypted by the backend.
*   **Session Management:** The application implements time-limited sessions (30 minutes) linked to the user's EPIC (Voter ID) number, simulating the security needed for shared terminals.
*   **User Interface:** The frontend uses custom CSS with a modern design system, avoiding large CSS frameworks to maintain a small footprint.

## How the Solution Works

1.  **Authentication:** Users log in with a 10-character Voter ID (EPIC Number). The application validates the format and checks it against a mock voter registry to identify the user's constituency.
2.  **Dashboard & Timeline:** After logging in, users are presented with a dashboard showing their constituency information and an outline of the current election cycle timeline.
3.  **Election Guide:** An interactive guide details the steps for voter registration, polling day procedures, how to use an EVM, and voter rights.
4.  **Multi-Language Support (Google Cloud Translation):** The interface supports 10 Indian languages. Text translation is handled dynamically by routing requests through the backend to the Google Cloud Translation API. Results are cached on the client to reduce API calls.
5.  **Smart Booth Finder (Google Maps):** 
    *   The application integrates the Google Maps JavaScript API to display polling booths for the user's assigned constituency.
    *   It uses geolocation and the Haversine formula to calculate the distance to each booth.
    *   It indicates estimated crowd levels and suggests the nearest, least crowded option.
    *   Directions to the booths are available via the map interface.
6.  **Secure Voting:** During the voting simulation, the user selects a candidate. The selection is encrypted locally using the Web Crypto API, submitted to the server, and a cryptographic receipt hash is returned to the user.

## Google Services Integration

1.  **Google Cloud Translation API (v3):** Translates UI text into regional languages (Hindi, Tamil, Telugu, Gujarati, Bengali, Marathi, Kannada, Malayalam, Punjabi).
2.  **Google Maps JavaScript API & Directions Service:** Renders the map interface, plots booth locations, calculates distances, and provides navigation routes.

## Assumptions Made

*   **Mock Data:** Due to restrictions on accessing the actual Election Commission of India (ECI) database, the application uses mock JSON files for voter registries, constituencies, booths, and candidates.
*   **Server as Election Authority:** The Node.js backend acts as the secure Election Commission server. It maintains the RSA private key required to decrypt the simulated votes.
*   **API Keys:** Google Services API keys are required for full functionality. These must be provided via a `.env` file. If the keys are not present, the application falls back to English only and displays a static placeholder map.

## Getting Started

### Prerequisites
*   Node.js installed
*   Google Cloud Project with Translation API and Maps JavaScript API enabled (required for translation and interactive map features)

### Installation
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Create a `.env` file in the root directory using `.env.example` as a template:
   ```
   GOOGLE_TRANSLATE_API_KEY=your_key_here
   GOOGLE_MAPS_API_KEY=your_key_here
   SESSION_SECRET=a_secure_random_string
   PORT=3000
   ```
4. Run `npm run dev` to start the server.
5. Navigate to `http://localhost:3000` in your web browser.

### Demo Voter IDs for Testing
*   `ABC1234567` (Delhi)
*   `DEF2345678` (Gujarat)
*   `GHI3456789` (Tamil Nadu)
