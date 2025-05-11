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

  console.log(`Attempting to toggle locker ${locker} to ${isOpen}, user UID: ${window.auth.currentUser ? window.auth.currentUser.uid : 'Not authenticated'}`);
  console.log(`Event data:`, eventData);
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
      console.log(`RTDB error details: ${error.code} - ${error.message}`);
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
      document.getElementById('current-password').textContent = `Website Password: ${newPassword}`;
    }).catch(error => {
      if (error.code === 'auth/requires-recent-login') {
        alert('This operation requires recent authentication. You will be logged out. Please log in again to update your password.');
        window.auth.signOut().then(() => {
          document.getElementById('login').style.display = 'block';
          document.getElementById('dashboard').style.display = 'none';
          document.getElementById('admin-panel').style.display = 'none';
          document.getElementById('user-panel').style.display = 'none';
        });
      } else {
        alert(error.message);
      }
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
        document.getElementById('current-email').textContent = `Current Email: ${newEmail}`;
      }).catch(error => {
        console.error('Email update error:', error);
        alert(error.message);
      });
    }).catch(error => {
      console.error('Verification email error:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('This operation requires recent authentication. You will be logged out. Please log in again to update your email.');
        window.auth.signOut().then(() => {
          document.getElementById('login').style.display = 'block';
          document.getElementById('dashboard').style.display = 'none';
          document.getElementById('admin-panel').style.display = 'none';
          document.getElementById('user-panel').style.display = 'none';
        });
      } else {
        alert(error.message);
      }
    });
  } else {
    console.error('Authentication not initialized');
  }
}

function updateLockerPassword() {
  if (window.auth && window.auth.currentUser && window.db) {
    window.db.ref(`users/${window.auth.currentUser.uid}`).once('value', snapshot => {
      const userData = snapshot.val();
      if (userData && userData.locker) {
        const newPassword = document.getElementById('locker-password').value;
        window.db.ref(`lockers/${userData.locker}/user`).update({ password: newPassword }).then(() => {
          alert('Locker password updated successfully');
        }).catch(error => {
          console.error('Failed to update locker password:', error);
          alert(error.message);
        });
      } else {
        alert('No locker assigned or user data not found');
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
    const isAdminLogin = document.getElementById('admin-login').checked;
    console.log(`Attempting login for ${email} as ${isAdminLogin ? 'admin' : 'user'}`);

    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        console.log('Login successful:', userCredential.user.email, 'UID:', userCredential.user.uid);
        userCredential.user.getIdTokenResult(true).then(idTokenResult => {
          console.log('Token result:', idTokenResult.claims);
          const role = idTokenResult.claims.role || 'user';

          // Check if login intent matches the user's role
          if (isAdminLogin && role !== 'admin') {
            console.log('Login failed: User attempted admin login but role is not admin');
            document.getElementById('error').textContent = 'Invalid login: You do not have admin privileges.';
            firebase.auth().signOut().then(() => {
              document.getElementById('login').style.display = 'block';
              document.getElementById('dashboard').style.display = 'none';
            }).catch(signOutError => {
              console.error('Sign out error after failed admin login:', signOutError);
            });
            return;
          }

          // Proceed to load dashboard if role matches intent
          console.log('Token refreshed after login');
          document.getElementById('login').style.display = 'none';
          document.getElementById('dashboard').style.display = 'block';
          loadDashboard(userCredential.user);
        }).catch(error => {
          console.error('Token refresh error:', error);
          document.getElementById('error').textContent = 'Failed to verify user role: ' + error.message;
        });
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
      console.log('Token result:', idTokenResult.claims);
      const role = idTokenResult.claims.role || 'user';
      console.log('User role:', role, 'UID:', user.uid);
      db.ref(`users/${user.uid}`).once('value', snapshot => {
        const userData = snapshot.val();
        if (!userData) {
          console.error('No user data found for UID:', user.uid);
          document.getElementById('current-email').textContent = 'Error: User data not found';
          document.getElementById('current-password').textContent = 'Error: User data not found';
          return;
        }
        console.log('User data from RTDB:', userData);
        document.getElementById('current-email').textContent = `Current Email: ${userData.email}`;
        document.getElementById('current-password').textContent = `Website Password: ${userData.password || 'Not set'}`;
      }).catch(error => {
        console.error('Error fetching user data:', error);
        document.getElementById('current-email').textContent = 'Error fetching user data';
        document.getElementById('current-password').textContent = 'Error fetching user data';
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
      console.error('Error getting token result:', error);
      document.getElementById('error').textContent = 'Failed to load dashboard';
    });
  }

  function loadAdminPanel() {
    const lockersTable = document.getElementById('lockers-table');
    const usersTable = document.getElementById('users-table');
    const adminHistoryList = document.getElementById('admin-history-list');

    db.ref('lockers').on('value', snapshot => {
      if (!snapshot.exists()) {
        console.error('No lockers data found');
        lockersTable.querySelector('tbody').innerHTML = '<tr><td colspan="7">No lockers data available</td></tr>';
        return;
      }
      console.log('Lockers snapshot:', snapshot.val());
      lockersTable.querySelector('tbody').innerHTML = '';
      snapshot.forEach(locker => {
        const lockerData = locker.val();
        if (!lockerData.current) {
          console.error(`No current data for ${locker.key}`);
          return;
        }
        const data = lockerData.current;
        const user = lockerData.user || {};
        const row = `<tr>
          <td class="border p-2">${locker.key}</td>
          <td class="border p-2">Temperature: ${data.temperature.toFixed(1)}°C</td>
          <td class="border p-2">Humidity: ${data.humidity.toFixed(1)}%</td>
          <td class="border p-2">Gas Level: ${data.gasLevel.toFixed(1)}%</td>
          <td class="border p-2">Weight: ${data.weight.toFixed(1)}g</td>
          <td class="border p-2">Status: ${data.isOpen ? 'Open' : 'Closed'}</td>
          <td class="border p-2">
            <button onclick="toggleLocker('${locker.key}', ${!data.isOpen})" class="bg-sky-500 text-white px-2 py-1 rounded hover:bg-sky-600 transition duration-200">${data.isOpen ? 'Close' : 'Open'}</button>
            <button onclick="deleteLockerData('${locker.key}')" class="bg-orange-400 text-white px-2 py-1 rounded hover:bg-orange-500 transition duration-200">Reset</button>
            <button onclick="promptUpdateLockerPassword('${locker.key}', '${user.password || ''}')" class="bg-sky-500 text-white px-2 py-1 rounded hover:bg-sky-600 transition duration-200">Update Password</button>
          </td>
        </tr>`;
        lockersTable.querySelector('tbody').innerHTML += row;
      });
    }, error => {
      console.error('Error reading lockers:', error);
      lockersTable.querySelector('tbody').innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
    });

    db.ref('users').on('value', snapshot => {
      usersTable.querySelector('tbody').innerHTML = '';
      snapshot.forEach(user => {
        const data = user.val();
        const row = `<tr>
          <td class="border p-2">${data.email}</td>
          <td class="border p-2">${data.password || 'Not set'}</td>
          <td class="border p-2">${data.role}</td>
          <td class="border p-2">${data.locker || 'None'}</td>
          <td class="border p-2">
            <button onclick="updateUser('${user.key}', '${data.email}', '${data.role}', '${data.locker}')" class="bg-sky-500 text-white px-2 py-1 rounded hover:bg-sky-600 transition duration-200">Edit</button>
            <button onclick="deleteUser('${user.key}')" class="bg-orange-400 text-white px-2 py-1 rounded hover:bg-orange-500 transition duration-200">Delete</button>
          </td>
        </tr>`;
        usersTable.querySelector('tbody').innerHTML += row;
      });
    }, error => {
      console.error('Error reading users:', error);
    });

    db.ref('lockers').on('value', snapshot => {
      adminHistoryList.innerHTML = '';
      if (!snapshot.exists()) {
        console.error('No history data found');
        adminHistoryList.innerHTML = '<li>No history data available</li>';
        return;
      }
      console.log('History snapshot:', snapshot.val());
      snapshot.forEach(locker => {
        const lockerData = locker.val();
        if (!lockerData.history || !lockerData.history.events) {
          console.warn(`No history events for ${locker.key}`);
          return;
        }
        const history = lockerData.history.events;
        Object.entries(history).forEach(([key, entry]) => {
          const formattedDate = new Date(entry.timestamp).toLocaleString();
          const eventText = entry.value !== undefined ? `${entry.event}: ${entry.value}` : entry.event;
          const listItem = `<li>${locker.key} - ${eventText} at ${formattedDate}</li>`;
          adminHistoryList.innerHTML += listItem;
        });
      });
    }, error => {
      console.error('Error reading history:', error);
      adminHistoryList.innerHTML = `<li>Error: ${error.message}</li>`;
    });
  }

  function loadUserPanel(uid) {
    const table = document.getElementById('user-locker-table');
    const lockerInfo = document.getElementById('user-locker-info');
    const userHistoryList = document.getElementById('user-history-list');

    db.ref(`users/${uid}`).once('value', snapshot => {
      const data = snapshot.val();
      if (!data) {
        console.error('No user data found for UID:', uid);
        lockerInfo.textContent = 'Error: User data not found';
        table.innerHTML = '<tr><td colspan="6">User data not found</td></tr>';
        userHistoryList.innerHTML = '<li>User data not found</li>';
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
            <td class="border p-2">Temperature: ${data.temperature.toFixed(1)}°C</td>
            <td class="border p-2">Humidity: ${data.humidity.toFixed(1)}%</td>
            <td class="border p-2">Gas Level: ${data.gasLevel.toFixed(1)}%</td>
            <td class="border p-2">Weight: ${data.weight.toFixed(1)}g</td>
            <td class="border p-2">Status: ${data.isOpen ? 'Open' : 'Closed'}</td>
            <td class="border p-2"><button onclick="toggleLocker('${locker}', ${!data.isOpen})" class="bg-sky-500 text-white px-2 py-1 rounded hover:bg-sky-600 transition duration-200">${data.isOpen ? 'Close' : 'Open'}</button></td>
          </tr>`;
        }, error => {
          console.error(`Error reading locker ${locker} data:`, error);
          table.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
        });

        db.ref(`lockers/${locker}/history/events`).on('value', snapshot => {
          userHistoryList.innerHTML = '';
          snapshot.forEach(entry => {
            const data = entry.val();
            const formattedDate = new Date(data.timestamp).toLocaleString();
            const eventText = data.value !== undefined ? `${data.event}: ${data.value}` : data.event;
            const listItem = `<li>${eventText} at ${formattedDate}</li>`;
            userHistoryList.innerHTML += listItem;
          });
        }, error => {
          console.error(`Error reading user history for ${locker}:`, error);
          userHistoryList.innerHTML = `<li>Error: ${error.message}</li>`;
        });
      } else {
        table.innerHTML = '<tr><td colspan="6">No locker assigned</td></tr>';
        userHistoryList.innerHTML = '<li>No history available</li>';
      }
    }, error => {
      console.error('Error reading user data:', error);
      lockerInfo.textContent = 'Error reading user data';
      table.innerHTML = '<tr><td colspan="6">Error reading user data</td></tr>';
      userHistoryList.innerHTML = '<li>Error reading user data</li>';
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
