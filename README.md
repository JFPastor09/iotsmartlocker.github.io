 Web interface for a smart locker system using Firebase Realtime Database and Authentication, hosted on GitHub Pages.

 ## Setup
 1. Clone the repository:
    ```bash
    git clone https://github.com/jfpastor09/iotsmartlocker.github.io.git
    ```
 2. Install Node.js and Firebase CLI:
    ```bash
    npm install -g firebase-tools
    ```
 3. Log in to Firebase:
    ```bash
    firebase login
    ```
 4. Deploy Cloud Function:
    ```bash
    cd functions
    npm install
    cd ..
    firebase deploy --only functions
    ```
 5. Update `scripts/app.js` with your Firebase config:
    ```javascript
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      databaseURL: "YOUR_DATABASE_URL",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    ```

 ## GitHub Pages
 - The website is hosted at `https://jfpastor09.github.io/iotsmartlocker.github.io/`.
 - Ensure the repository is public and GitHub Pages is enabled (Settings > Pages > Source: Deploy from a branch, Branch: main, Folder: / (root)).

 ## Usage
 - **Admin**: Log in with `admin@lockers.com` to manage all lockers and users.
 - **Users**: Log in with `userX@lockers.com` to view/control assigned locker.
 - Integrates with LockerSensors (sensors), SmartLocker (RFID/keypad), and LockerLEDs (LEDs).

 ## Notes
 - Ensure LockerSensors NodeMCU is stable (no reboots) to update `/lockers/lockerX/current`.
 - Charts display open/close events; temperature, gas, and weight data may need NodeMCU fixes.
 - Deploy the Cloud Function to Firebase to assign user roles and populate `/users`.
