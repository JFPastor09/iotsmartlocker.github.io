console.log('app.js loaded');

// Global scope functions for inline onclick handlers
function toggleLocker(locker, isOpen) {
  if (!window.db) return;
  const eventData = { event: isOpen ? 'Opened (Website)' : 'Closed (Website)', timestamp: new Date().toISOString() };
  window.db.ref(`lockers/${locker}/history/events`).push(eventData)
    .then(() => window.db.ref(`lockers/${locker}/current/isOpen`).set(isOpen))
    .catch(error => alert(`Failed to update locker ${locker}: ${error.message}`));
}

function deleteLockerData(locker) {
  if (window.db) window.db.ref(`lockers/${locker}/current`).set({ temperature: 0, humidity: 0, gasLevel: 0, weight: 0, isOpen: false });
}

function updateUser(uid, email, role, locker) {
  if (window.db && window.firebase) {
    const newEmail = prompt('Enter new email', email);
    const newRole = prompt('Enter role (admin/user)', role);
    const newLocker = prompt('Enter locker (locker1/locker2/locker3/null)', locker || '');
    const newPassword = prompt('Enter new website password', '');
    if (newEmail && newRole) {
      window.db.ref(`users/${uid}`).update({ email: newEmail, role: newRole, locker: newLocker || null, password: newPassword || null });
      window.firebase.auth().updateUser(uid, { email: newEmail });
      window.firebase.auth().setCustomUserClaims(uid, { role: newRole });
    }
  }
}

function deleteUser(uid) {
  if (window.db && window.firebase) {
    window.db.ref(`users/${uid}`).remove();
    window.firebase.auth().deleteUser(uid);
  }
}

function updatePassword() {
  if (window.auth.currentUser) {
    const newPassword = document.getElementById('new-password').value;
    window.auth.currentUser.updatePassword(newPassword).then(() => {
      window.db.ref(`users/${window.auth.currentUser.uid}`).update({ password: newPassword });
      document.getElementById('current-password').textContent = `Website Password: ${newPassword}`;
    }).catch(error => alert(error.message));
  }
}

function updateEmail() {
  if (window.auth.currentUser) {
    const newEmail = document.getElementById('new-email').value;
    window.auth.currentUser.verifyBeforeUpdateEmail(newEmail).then(() => {
      window.auth.currentUser.updateEmail(newEmail).then(() => {
        window.db.ref(`users/${window.auth.currentUser.uid}`).update({ email: newEmail });
        document.getElementById('current-email').textContent = `Current Email: ${newEmail}`;
      }).catch(error => alert(error.message));
    }).catch(error => alert(error.message));
  }
}

function updateLockerPassword() {
  if (window.auth.currentUser && window.db) {
    window.db.ref(`users/${window.auth.currentUser.uid}`).once('value', snapshot => {
      if (snapshot.val()?.locker) {
        const newPassword = document.getElementById('locker-password').value;
        window.db.ref(`lockers/${snapshot.val().locker}/user`).update({ password: newPassword });
      } else alert('No locker assigned');
    });
  }
}

function promptUpdateLockerPassword(locker, currentPassword) {
  if (!window.db) {
    alert('Database not initialized. Please try again.');
    return;
  }
  const newPassword = prompt('Enter new locker password', currentPassword || '');
  if (newPassword !== null && newPassword.trim() !== '') {
    window.db.ref(`lockers/${locker}/user`).update({ password: newPassword })
      .then(() => console.log(`Locker ${locker} password updated successfully`))
      .catch(error => alert(`Failed to update locker password: ${error.message}`));
  } else {
    console.log('Password update cancelled or empty input');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.firebase) {
    document.getElementById('error').textContent = 'Firebase SDK unavailable';
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyDSD2v54Rd7aeXWoKp5_Dy6xP3Yq9gAyro",
    authDomain: "lockeriot-415dc.firebaseapp.com",
    databaseURL: "https://lockeriot-415dc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lockeriot-415dc",
    storageBucket: "lockeriot-415dc.firebasestorage.app",
    messagingSenderId: "522726216699",
    appId: "1:522726216699:web:207d7f9a2b454a6ef5315e",
    measurementId: "G-EHW59SN3TC"
  };

  let auth, db;
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.database();
    window.db = db;
    window.auth = auth;
    window.firebase = firebase;
  } catch (error) {
    document.getElementById('error').textContent = 'Failed to initialize Firebase';
    return;
  }

  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');

  function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isAdminLogin = document.getElementById('admin-login').checked;
    console.log(`Login attempt: ${email}, Admin: ${isAdminLogin}`);

    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        console.log('Login successful, UID:', userCredential.user.uid);
        return userCredential.user.getIdTokenResult(true);
      })
      .then(idTokenResult => {
        console.log('Token claims:', idTokenResult.claims);
        const role = idTokenResult.claims.role || 'user';
        console.log('Detected role:', role);

        if (isAdminLogin && role !== 'admin') {
          console.log('Admin login denied, role mismatch');
          document.getElementById('error').textContent = 'Invalid login: You do not have admin privileges.';
          return firebase.auth().signOut().then(() => {
            document.getElementById('login').style.display = 'block';
            document.getElementById('dashboard').style.display = 'none';
          });
        }

        document.getElementById('login').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadDashboard(firebase.auth().currentUser);
      })
      .catch(error => {
        console.error('Login error:', error.code, error.message);
        document.getElementById('error').textContent = error.message;
      });
  }

  function logout() {
    auth.signOut().then(() => {
      document.getElementById('login').style.display = 'block';
      document.getElementById('dashboard').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'none';
      document.getElementById('user-panel').style.display = 'none';
    }).catch(error => console.error('Logout error:', error));
  }

  function loadDashboard(user) {
    user.getIdTokenResult(true).then(idTokenResult => {
      const role = idTokenResult.claims.role || 'user';
      db.ref(`users/${user.uid}`).once('value', snapshot => {
        const userData = snapshot.val() || {};
        document.getElementById('current-email').textContent = `Current Email: ${userData.email || 'Not set'}`;
        document.getElementById('current-password').textContent = `Website Password: ${userData.password || 'Not set'}`;
      }).catch(error => {
        console.error('Error reading user data:', error);
        document.getElementById('error').textContent = 'Failed to load user data';
      });

      if (role === 'admin') {
        document.getElementById('dashboard-header').textContent = 'Admin Dashboard';
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('user-panel').style.display = 'none';
        loadAdminPanel();
      } else {
        document.getElementById('dashboard-header').textContent = 'User Dashboard';
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('user-panel').style.display = 'block';
        loadUserPanel(user.uid);
      }
    }).catch(error => {
      console.error('Dashboard load error:', error);
      document.getElementById('error').textContent = 'Failed to load dashboard';
    });
  }

  function loadAdminPanel() {
    const lockersTable = document.getElementById('lockers-table');
    const usersTable = document.getElementById('users-table');
    const adminHistoryList = document.getElementById('admin-history-list');

    db.ref('lockers').on('value', snapshot => {
      lockersTable.querySelector('tbody').innerHTML = '';
      snapshot.forEach(locker => {
        const data = locker.val().current || {};
        const user = locker.val().user || {};
        lockersTable.querySelector('tbody').innerHTML += `<tr><td>${locker.key}</td><td>Temperature: ${data.temperature.toFixed(1)}°C</td><td>Humidity: ${data.humidity.toFixed(1)}%</td><td>Gas Level: ${data.gasLevel.toFixed(1)}%</td><td>Weight: ${data.weight.toFixed(1)}g</td><td>Status: ${data.isOpen ? 'Open' : 'Closed'}</td><td><button onclick="toggleLocker('${locker.key}', ${!data.isOpen})">${data.isOpen ? 'Close' : 'Open'}</button><button onclick="deleteLockerData('${locker.key}')">Reset</button><button onclick="promptUpdateLockerPassword('${locker.key}', '${user.password || ''}')">Update Password</button></td></tr>`;
      });
    });

    db.ref('users').on('value', snapshot => {
      usersTable.querySelector('tbody').innerHTML = '';
      snapshot.forEach(user => {
        const data = user.val();
        usersTable.querySelector('tbody').innerHTML += `<tr><td>${data.email}</td><td>${data.password || 'Not set'}</td><td>${data.role}</td><td>${data.locker || 'None'}</td><td><button onclick="updateUser('${user.key}', '${data.email}', '${data.role}', '${data.locker}')">Edit</button><button onclick="deleteUser('${user.key}')">Delete</button></td></tr>`;
      });
    });

    db.ref('lockers').on('value', snapshot => {
      adminHistoryList.innerHTML = '';
      snapshot.forEach(locker => {
        const events = locker.val().history?.events || {};
        Object.entries(events).forEach(([key, entry]) => {
          const formattedDate = new Date(entry.timestamp).toLocaleString();
          adminHistoryList.innerHTML += `<li>${locker.key} - ${entry.event} at ${formattedDate}</li>`;
        });
      });
    });
  }

  function loadUserPanel(uid) {
    const table = document.getElementById('user-locker-table');
    const lockerInfo = document.getElementById('user-locker-info');
    const userHistoryList = document.getElementById('user-history-list');

    db.ref(`users/${uid}`).once('value', snapshot => {
      const data = snapshot.val() || {};
      lockerInfo.textContent = `Assigned Locker: ${data.locker || 'None'}`;
      if (data.locker) {
        db.ref(`lockers/${data.locker}/current`).on('value', snap => {
          const d = snap.val() || {};
          table.innerHTML = `<tr><td>Temperature: ${d.temperature.toFixed(1)}°C</td><td>Humidity: ${d.humidity.toFixed(1)}%</td><td>Gas Level: ${d.gasLevel.toFixed(1)}%</td><td>Weight: ${d.weight.toFixed(1)}g</td><td>Status: ${d.isOpen ? 'Open' : 'Closed'}</td><td><button onclick="toggleLocker('${data.locker}', ${!d.isOpen})">${d.isOpen ? 'Close' : 'Open'}</button></td></tr>`;
        });
        db.ref(`lockers/${data.locker}/history/events`).on('value', snap => {
          userHistoryList.innerHTML = '';
          snap.forEach(entry => {
            const d = entry.val();
            userHistoryList.innerHTML += `<li>${d.event} at ${new Date(d.timestamp).toLocaleString()}</li>`;
          });
        });
      } else {
        table.innerHTML = '<tr><td colspan="6">No locker assigned</td></tr>';
        userHistoryList.innerHTML = '<li>No history available</li>';
      }
    });
  }

  loginButton.addEventListener('click', login);
  logoutButton.addEventListener('click', logout);

  auth.onAuthStateChanged(user => {
    if (user) {
      document.getElementById('login').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      loadDashboard(user);
    } else {
      document.getElementById('login').style.display = 'block';
      document.getElementById('dashboard').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'none';
      document.getElementById('user-panel').style.display = 'none';
    }
  });
});
