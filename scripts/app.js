console.log('app.js loaded');

// Global scope functions for inline onclick handlers
function toggleLocker(locker, isOpen) {
  if (!window.db) {
    console.error('Database not initialized');
    return;
  }

  const eventData = {
    event: isOpen ? 'Opened (Website)' : 'Closed (Website)',
    timestamp: new Date().toISOString()
  };

  window.db.ref(`lockers/${locker}/history/events`).push(eventData)
    .then((snapshot) => {
      console.log(`History event recorded for ${locker} with key: ${snapshot.key}`);
      window.db.ref(`lockers/${locker}/current/isOpen`).set(isOpen)
        .then(() => {
          console.log(`Locker ${locker} state updated to ${isOpen}`);
        })
        .catch((error) => {
          console.error(`Failed to update isOpen for ${locker}:`, error);
          alert(`Failed to update locker state: ${error.message}`);
        });
    })
    .catch((error) => {
      console.error(`Failed to record history event for ${locker}:`, error);
      alert(`Failed to log event: ${error.message}`);
    });
}

function deleteLockerData(locker) {
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
  const newEmail = prompt('Enter new email', email);
  const newRole = prompt('Enter role (admin/user)', role);
  const newLocker = prompt('Enter locker (locker1/locker2/locker3/null)', locker || '');
  const newPassword = prompt('Enter new website password', '');
  if (newEmail && newRole) {
    if (window.db && window.firebase) {
      window.db.ref(`users/${uid}`).update({
        email: newEmail,
        role: newRole,
        locker: newLocker || null,
        password: newPassword || null
      }).catch(error => console.error(`User update failed for ${uid}:`, error));
      window.firebase.auth().updateUser(uid, { email: newEmail }).catch(error => console.error(error));
      window.firebase.auth().setCustomUserClaims(uid, { role: newRole }).catch(error => console.error(`Claims update failed for ${uid}:`, error));
    } else {
      console.error('Firebase or database not initialized');
    }
  }
}

function deleteUser(uid) {
  if (window.db && window.firebase) {
    window.db.ref(`users/${uid}`).remove().catch(error => console.error(`User delete failed for ${uid}:`, error));
    window.firebase.auth().deleteUser(uid).catch(error => console.error(error));
  } else {
    console.error('Firebase or database not initialized');
  }
}

function updatePassword() {
  if (window.auth && window.auth.currentUser) {
    const newPassword = document.getElementById('new-password').value;
    window.auth.currentUser.updatePassword(newPassword).then(() => {
      window.db.ref(`users/${window.auth.currentUser.uid}`).update({ password: newPassword }).catch(error => {
        console.error('Failed to update password in RTDB:', error);
      });
    }).catch(error => {
      alert(error.message);
    });
  } else {
    console.error('Authentication not initialized');
  }
}

function updateEmail() {
  if (window.auth && window.auth.currentUser) {
    const newEmail = document.getElementById('new-email').value;
    window.auth.currentUser.verifyBeforeUpdateEmail(newEmail).then(() => {
      alert('Verification email sent. Please verify the new email before updating.');
      window.auth.currentUser.updateEmail(newEmail).then(() => {
        window.db.ref(`users/${window.auth.currentUser.uid}`).update({ email: newEmail }).catch(error => {
          console.error('Failed to update email in RTDB:', error);
        });
      }).catch(error => {
        console.error('Email update error:', error);
        alert(error.message);
      });
    }).catch(error => {
      console.error('Verification email error:', error);
      alert(error.message);
    });
  } else {
    console.error('Authentication not initialized');
  }
}

function updateLockerPassword() {
  if (window.auth && window.auth.currentUser && window.db) {
    window.db.ref(`users/${window.auth.currentUser.uid}`).once('value', snapshot => {
      const userData = snapshot.val();
      if (userData.locker) {
        const newPassword = document.getElementById('locker-password').value;
        window.db.ref(`lockers/${userData.locker}/user`).update({ password: newPassword }).then(() => {
          alert('Locker password updated successfully');
        }).catch(error => {
          console.error('Failed to update locker password:', error);
          alert(error.message);
        });
      } else {
        alert('No locker assigned');
      }
    });
  } else {
    console.error('Authentication or database not initialized');
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
    window.db = db;
    window.auth = auth;
    window.firebase = firebase;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    document.getElementById('error').textContent = 'Failed to initialize Firebase';
    return;
  }

  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(error => {
    console.error('Persistence error:', error);
  });

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
    user.getIdTokenResult(true).then(idTokenResult => {
      const role = idTokenResult.claims.role || 'user';
      console.log('User role:', role);
      console.log('User UID:', user.uid);
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
      console.error('Error getting token result:', error);
      document.getElementById('error').textContent = 'Failed to load dashboard';
    });
  }

  function loadAdminPanel() {
    const lockersTable = document.getElementById('lockers-table');
    const usersTable = document.getElementById('users-table');
    const historyTable = document.getElementById('admin-history-table');
    
    db.ref('lockers').on('value', snapshot => {
      if (!snapshot.exists()) {
        console.error('No lockers data found');
        lockersTable.innerHTML = '<tr><td colspan="8">No lockers data available</td></tr>';
        return;
      }
      lockersTable.innerHTML = '<tr><th>Locker Number</th><th>Temp (°C)</th><th>Humidity (%)</th><th>Gas (%)</th><th>Weight (g)</th><th>Presence</th><th>Status</th><th>Actions</th></tr>';
      snapshot.forEach(locker => {
        const data = locker.val().current;
        const user = locker.val().user || {};
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
            <button onclick="promptUpdateLockerPassword('${locker.key}', '${user.password || ''}')">Update Password</button>
          </td>
        </tr>`;
        lockersTable.innerHTML += row;
      });
    }, error => {
      console.error('Error reading lockers:', error);
      lockersTable.innerHTML = `<tr><td colspan="8">Error: ${error.message}</td></tr>`;
    });

    db.ref('users').on('value', snapshot => {
      usersTable.innerHTML = '<tr><th>Email</th><th>Website Password</th><th>Role</th><th>Locker</th><th>Actions</th></tr>';
      snapshot.forEach(user => {
        const data = user.val();
        const row = `<tr>
          <td>${data.email}</td>
          <td>${data.password || 'Not set'}</td>
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

    db.ref('lockers').on('value', snapshot => {
      historyTable.innerHTML = '<tr><th>Locker</th><th>Event</th><th>Value</th><th>Timestamp</th></tr>';
      snapshot.forEach(locker => {
        const history = locker.val().history?.events || {};
        Object.entries(history).forEach(([key, entry]) => {
          const row = `<tr>
            <td>${locker.key}</td>
            <td>${entry.event}</td>
            <td>${entry.value !== undefined ? entry.value : '-'}</td>
            <td>${entry.timestamp}</td>
          </tr>`;
          historyTable.innerHTML += row;
        });
      });
    }, error => {
      console.error('Error reading history:', error);
    });
  }

  function loadUserPanel(uid) {
    const table = document.getElementById('user-locker-table');
    const lockerInfo = document.getElementById('user-locker-info');
    const historyTable = document.getElementById('user-history-table');

    db.ref(`users/${uid}`).once('value', snapshot => {
      const data = snapshot.val();
      if (!data) {
        console.error('No user data found for UID:', uid);
        return;
      }
      console.log('User data:', data);
      lockerInfo.textContent = `Assigned Locker: ${data.locker || 'None'}`;
      
      if (data.locker) {
        const locker = data.locker;
        db.ref(`lockers/${locker}/current`).on('value', snapshot => {
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
          table.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
        });

        db.ref(`lockers/${locker}/history/events`).on('value', snapshot => {
          historyTable.innerHTML = '<tr><th>Event</th><th>Value</th><th>Timestamp</th></tr>';
          snapshot.forEach(entry => {
            const data = entry.val();
            const row = `<tr>
              <td>${data.event}</td>
              <td>${data.value !== undefined ? data.value : '-'}</td>
              <td>${data.timestamp}</td>
            </tr>`;
            historyTable.innerHTML += row;
          });
        }, error => {
          console.error(`Error reading user history for ${locker}:`, error);
        });
      } else {
        table.innerHTML = '<tr><td colspan="7">No locker assigned</td></tr>';
        historyTable.innerHTML = '<tr><td colspan="3">No history available</td></tr>';
      }
    }, error => {
      console.error('Error reading user data:', error);
    });
  }

  function promptUpdateLockerPassword(locker, currentPassword) {
    const newPassword = prompt('Enter new locker password', currentPassword);
    if (newPassword) {
      window.db.ref(`lockers/${locker}/user`).update({ password: newPassword }).then(() => {
        alert('Locker password updated successfully');
      }).catch(error => {
        console.error(`Failed to update password for ${locker}:`, error);
        alert(error.message);
      });
    }
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
