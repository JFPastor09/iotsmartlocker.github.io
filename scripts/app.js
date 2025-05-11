console.log('app.js loaded'); // Debug: Confirm script load

// Global scope functions for inline onclick handlers
function toggleLocker(locker, isOpen) {
  console.log(`Attempting to toggle locker ${locker} to ${isOpen}`); // Debug
  if (window.db) {
    window.db.ref(`lockers/${locker}/current/isOpen`).set(isOpen).catch(error => {
      console.error(`Toggle failed for ${locker}:`, error);
    });
    window.db.ref(`lockers/${locker}/history/events`).push({
      event: isOpen ? 'Opened (Website)' : 'Closed (Website)',
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.error(`History push failed for ${locker}:`, error);
    });
  } else {
    console.error('Database not initialized');
  }
}

function deleteLockerData(locker) {
  console.log(`Attempting to reset locker ${locker}`); // Debug
  if (window.db) {
    window.db.ref(`lockers/${locker}/current`).set({
      temperature: 0,
      humidity: 0,
      gasLevel: 0,
      weight: 0,
      presence: false,
      isOpen: false
    }).catch(error => {
      console.error(`Reset failed for ${locker}:`, error);
    });
  } else {
    console.error('Database not initialized');
  }
}

function updateUser(uid, email, role, locker) {
  console.log(`Attempting to update user ${uid}`); // Debug
  const newEmail = prompt('Enter new email', email);
  const newRole = prompt('Enter role (admin/user)', role);
  const newLocker = prompt('Enter locker (locker1/locker2/locker3/null)', locker || '');
  if (newEmail && newRole) {
    if (window.db && window.firebase) {
      window.db.ref(`users/${uid}`).update({
        email: newEmail,
        role: newRole,
        locker: newLocker || null
      }).catch(error => console.error(`User update failed for ${uid}:`, error));
      window.firebase.auth().updateUser(uid, { email: newEmail }).catch(error => console.error(error));
      window.firebase.auth().setCustomUserClaims(uid, { role: newRole }).catch(error => console.error(`Claims update failed for ${uid}:`, error));
    } else {
      console.error('Firebase or database not initialized');
    }
  }
}

function deleteUser(uid) {
  console.log(`Attempting to delete user ${uid}`); // Debug
  if (window.db && window.firebase) {
    window.db.ref(`users/${uid}`).remove().catch(error => console.error(`User delete failed for ${uid}:`, error));
    window.firebase.auth().deleteUser(uid).catch(error => console.error(error));
  } else {
    console.error('Firebase or database not initialized');
  }
}

function updatePassword() {
  console.log('updatePassword called'); // Debug: Confirm function execution
  if (window.auth && window.auth.currentUser) {
    const newPassword = document.getElementById('new-password').value;
    window.auth.currentUser.updatePassword(newPassword).catch(error => {
      alert(error.message);
    });
  } else {
    console.error('Authentication not initialized');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.firebase) {
    console.error('Firebase SDK not loaded');
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
    console.log('Firebase initialized');
    // Attach db, auth, and firebase to window for global functions
    window.db = db;
    window.auth = auth;
    window.firebase = firebase;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    document.getElementById('error').textContent = 'Failed to initialize Firebase';
    return;
  }

  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');

  function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        console.log('Login successful:', userCredential.user.email);
        document.getElementById('login').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadDashboard(userCredential.user);
      })
      .catch(error => {
        console.error('Login error:', error);
        document.getElementById('error').textContent = error.message;
      });
  }

  function logout() {
    auth.signOut().then(() => {
      console.log('Logout successful');
      document.getElementById('login').style.display = 'block';
      document.getElementById('dashboard').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'none';
      document.getElementById('user-panel').style.display = 'none';
    }).catch(error => {
      console.error('Logout error:', error);
    });
  }

  function loadDashboard(user) {
    console.log('Loading dashboard for UID:', user.uid); // Debug
    user.getIdTokenResult(true).then(idTokenResult => {
      const role = idTokenResult.claims.role || 'user';
      console.log('User role:', role);
      console.log('User UID:', user.uid); // Debug UID
      if (role === 'admin') {
        document.getElementById('admin-panel').style.display = 'block';
        loadAdminPanel();
      } else {
        document.getElementById('user-panel').style.display = 'block';
        loadUserPanel(user.uid);
      }
    }).catch(error => {
      console.error('Error getting token result:', error);
      document.getElementById('error').textContent = 'Failed to load dashboard';
    });
  }

  function loadAdminPanel() {
    console.log('Loading admin panel'); // Debug
    const lockersTable = document.getElementById('lockers-table');
    const usersTable = document.getElementById('users-table');
    db.ref('lockers').on('value', snapshot => {
      console.log('Reading lockers data'); // Debug
      lockersTable.innerHTML = '<tr><th>Locker</th><th>Temp (°C)</th><th>Humidity (%)</th><th>Gas (%)</th><th>Weight (g)</th><th>Presence</th><th>Status</th><th>Actions</th></tr>';
      snapshot.forEach(locker => {
        const data = locker.val().current;
        const row = `<tr>
          <td>${locker.key}</td>
          <td>${data.temperature.toFixed(1)}</td>
          <td>${data.humidity.toFixed(1)}</td>
          <td>${data.gasLevel.toFixed(1)}</td>
          <td>${data.weight.toFixed(1)}</td>
          <td>${data.presence ? 'Yes' : 'No'}</td>
          <td>${data.isOpen ? 'Open' : 'Closed'}</td>
          <td>
            <button onclick="toggleLocker('${locker.key}', ${!data.isOpen})">${data.isOpen ? 'Close' : 'Open'}</button>
            <button onclick="deleteLockerData('${locker.key}')">Reset</button>
          </td>
        </tr>`;
        lockersTable.innerHTML += row;
      });
    }, error => {
      console.error('Error reading lockers:', error);
    });
    db.ref('users').on('value', snapshot => {
      console.log('Reading users data'); // Debug
      usersTable.innerHTML = '<tr><th>Email</th><th>Role</th><th>Locker</th><th>Actions</th></tr>';
      snapshot.forEach(user => {
        const data = user.val();
        const row = `<tr>
          <td>${data.email}</td>
          <td>${data.role}</td>
          <td>${data.locker || 'None'}</td>
          <td>
            <button onclick="updateUser('${user.key}', '${data.email}', '${data.role}', '${data.locker}')">Edit</button>
            <button onclick="deleteUser('${user.key}')">Delete</button>
        </td>
        </tr>`;
        usersTable.innerHTML += row;
      });
    }, error => {
      console.error('Error reading users:', error);
    });
    loadAdminChart();
  }

  function loadUserPanel(uid) {
    console.log(`Loading user panel for UID: ${uid}`); // Debug
    db.ref(`users/${uid}`).once('value', snapshot => {
      const data = snapshot.val();
      if (!data) console.error('No user data found for UID:', uid);
      console.log('User data:', data);
      if (data && data.locker) {
        const locker = data.locker;
        const table = document.getElementById('user-locker-table');
        db.ref(`lockers/${locker}/current`).on('value', snapshot => {
          console.log(`Reading locker ${locker} data`); // Debug
          const data = snapshot.val();
          console.log('Locker data:', data);
          table.innerHTML = `<tr>
            <td>${data.temperature.toFixed(1)}</td>
            <td>${data.humidity.toFixed(1)}</td>
            <td>${data.gasLevel.toFixed(1)}</td>
            <td>${data.weight.toFixed(1)}</td>
            <td>${data.presence ? 'Yes' : 'No'}</td>
            <td>${data.isOpen ? 'Open' : 'Closed'}</td>
            <td><button onclick="toggleLocker('${locker}', ${!data.isOpen})">${data.isOpen ? 'Close' : 'Open'}</button></td>
          </tr>`;
        }, error => {
          console.error(`Error reading locker ${locker} data:`, error);
        });
        loadUserChart(locker);
      } else {
        document.getElementById('user-locker-table').innerHTML = '<tr><td colspan="7">No locker assigned</td></tr>';
      }
    }, error => {
      console.error('Error reading user data:', error);
    });
  }

  function loadAdminChart() {
    console.log('Loading admin chart'); // Debug
    const ctx = document.getElementById('admin-chart').getContext('2d');
    db.ref('lockers').once('value', snapshot => {
      console.log('Reading lockers for chart'); // Debug
      const datasets = [];
      const lockers = ['locker1', 'locker2', 'locker3'];
      lockers.forEach(locker => {
        const history = snapshot.val()[locker].history?.events || {};
        const times = [];
        const events = [];
        Object.values(history).forEach(entry => {
          if (entry.timestamp !== 'No time') {
            times.push(new Date(entry.timestamp));
            events.push(entry.event.includes('Opened') ? 1 : 0);
          }
        });
        datasets.push({
          label: `${locker} Open/Close`,
          data: events,
          borderColor: locker === 'locker1' ? 'red' : locker === 'locker2' ? 'blue' : 'green',
          fill: false,
          stepped: true
        });
      });
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: times,
          datasets: datasets
        },
        options: {
          scales: {
            x: {
              type: 'time',
              title: {
                display: true,
                text: 'Time'
              }
            },
            y: {
              min: 0,
              max: 1,
              title: {
                display: true,
                text: 'State (1=Open, 0=Closed)'
              }
            }
          }
        }
      });
    }, error => {
      console.error('Error reading chart data:', error);
    });
  }

  function loadUserChart(locker) {
    console.log(`Loading user chart for locker ${locker}`); // Debug
    const ctx = document.getElementById('user-chart').getContext('2d');
    db.ref(`lockers/${locker}/history/events`).once('value', snapshot => {
      console.log(`Reading history for locker ${locker}`); // Debug
      const times = [];
      const events = [];
      snapshot.forEach(entry => {
        const data = entry.val();
        if (data.timestamp !== 'No time') {
          times.push(new Date(data.timestamp));
          events.push(data.event.includes('Opened') ? 1 : 0);
        }
      });
      console.log('User Chart Data:', { times, events });
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: times,
          datasets: [
            {
              label: 'Open/Close',
              data: events,
              borderColor: 'blue',
              fill: false,
              stepped: true
            }
          ]
        },
        options: {
          scales: {
            x: {
              type: 'time',
              title: {
                display: true,
                text: 'Time'
              }
            },
            y: {
              min: 0,
              max: 1,
              title: {
                display: true,
                text: 'State (1=Open, 0=Closed)'
              }
            }
          }
        }
      });
    }, error => {
      console.error(`Error reading user chart data for ${locker}:`, error);
    });
  }

  loginButton.addEventListener('click', login);
  logoutButton.addEventListener('click', logout);
});
