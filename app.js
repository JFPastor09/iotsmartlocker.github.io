// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAbuekJkyQE_eXfOHrrzcwPv1WLREimE6s",
  authDomain: "lockers-research000.firebaseapp.com",
  databaseURL: "https://lockers-research000-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lockers-research000",
  storageBucket: "lockers-research000.firebasestorage.app",
  messagingSenderId: "799237849292",
  appId: "1:799237849292:web:91b561d974731c6b7fc269",
  measurementId: "G-M4WTDG3LYH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const loginPage = document.getElementById('login-page');
const userDashboard = document.getElementById('user-dashboard');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const welcomeMessage = document.getElementById('welcome-message');
const adminWelcomeMessage = document.getElementById('admin-welcome-message');
const lockersContainer = document.getElementById('lockers-container');
const adminLockersContainer = document.getElementById('admin-lockers-container');
const usersManagement = document.getElementById('users-management');
const lockersManagement = document.getElementById('lockers-management');
const usersTable = document.getElementById('users-table');
const lockersTable = document.getElementById('lockers-table');

// Login functionality
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Get user data from database
            const userId = userCredential.user.uid;
            database.ref('users/' + userId).once('value')
                .then((snapshot) => {
                    const userData = snapshot.val();
                    
                    if (userData.role === 'admin') {
                        showAdminDashboard(userData);
                    } else {
                        showUserDashboard(userData);
                    }
                    
                    loginError.classList.add('d-none');
                })
                .catch((error) => {
                    showLoginError(error.message);
                });
        })
        .catch((error) => {
            showLoginError(error.message);
        });
});

// Logout functionality
document.getElementById('logout-link')?.addEventListener('click', logout);
document.getElementById('admin-logout-link')?.addEventListener('click', logout);

function logout() {
    auth.signOut().then(() => {
        userDashboard.classList.add('d-none');
        adminDashboard.classList.add('d-none');
        loginPage.classList.remove('d-none');
    });
}

// Navigation for admin
document.getElementById('manage-users-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('admin-dashboard-link').classList.remove('active');
    document.getElementById('manage-users-link').classList.add('active');
    document.getElementById('manage-lockers-link').classList.remove('active');
    
    adminLockersContainer.classList.add('d-none');
    lockersManagement.classList.add('d-none');
    usersManagement.classList.remove('d-none');
    
    loadUsers();
});

document.getElementById('manage-lockers-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('admin-dashboard-link').classList.remove('active');
    document.getElementById('manage-users-link').classList.remove('active');
    document.getElementById('manage-lockers-link').classList.add('active');
    
    adminLockersContainer.classList.add('d-none');
    usersManagement.classList.add('d-none');
    lockersManagement.classList.remove('d-none');
    
    loadLockersForManagement();
});

document.getElementById('admin-dashboard-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('admin-dashboard-link').classList.add('active');
    document.getElementById('manage-users-link').classList.remove('active');
    document.getElementById('manage-lockers-link').classList.remove('active');
    
    usersManagement.classList.add('d-none');
    lockersManagement.classList.add('d-none');
    adminLockersContainer.classList.remove('d-none');
});

// Helper functions
function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('d-none');
}

function showUserDashboard(userData) {
    loginPage.classList.add('d-none');
    adminDashboard.classList.add('d-none');
    userDashboard.classList.remove('d-none');
    
    welcomeMessage.textContent = `Welcome, ${userData.name || 'User'}!`;
    
    // Load user's locker data
    if (userData.assignedLocker) {
        loadLockerData(userData.assignedLocker);
    } else {
        lockersContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">No locker assigned to you.</div></div>';
    }
}

function showAdminDashboard(userData) {
    loginPage.classList.add('d-none');
    userDashboard.classList.add('d-none');
    adminDashboard.classList.remove('d-none');
    
    adminWelcomeMessage.textContent = `Welcome, ${userData.name || 'Admin'}!`;
    
    // Load all lockers for admin view
    loadAllLockers();
}

function loadLockerData(lockerId) {
    const lockerRef = database.ref('lockers/' + lockerId);
    
    lockerRef.on('value', (snapshot) => {
        const lockerData = snapshot.val();
        if (lockerData) {
            renderLockerCard(lockerId, lockerData, false);
        }
    });
}

function loadAllLockers() {
    const lockersRef = database.ref('lockers');
    
    lockersRef.on('value', (snapshot) => {
        adminLockersContainer.innerHTML = '';
        const lockers = snapshot.val();
        
        if (lockers) {
            Object.keys(lockers).forEach(lockerId => {
                renderLockerCard(lockerId, lockers[lockerId], true);
            });
        } else {
            adminLockersContainer.innerHTML = '<div class="col-12"><div class="alert alert-info">No lockers found.</div></div>';
        }
    });
}

function renderLockerCard(lockerId, lockerData, isAdmin) {
    const container = isAdmin ? adminLockersContainer : lockersContainer;
    container.innerHTML = ''; // Clear previous content
    
    const statusClass = lockerData.status === 'available' ? 'status-available' : 'status-occupied';
    const assignedUser = lockerData.assignedUser ? lockerData.assignedUser : 'None';
    
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4';
    card.innerHTML = `
        <div class="card locker-card">
            <div class="card-header bg-primary text-white">
                <h5 class="card-title mb-0">Locker ${lockerId}</h5>
            </div>
            <div class="card-body">
                <p class="card-text locker-status ${statusClass}">Status: ${lockerData.status}</p>
                ${isAdmin ? `<p class="card-text">Assigned to: ${assignedUser}</p>` : ''}
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <div class="sensor-label">Temperature</div>
                        <div class="sensor-value" id="temp-${lockerId}">${lockerData.temperature || '--'}°C</div>
                    </div>
                    <div class="col-md-6">
                        <div class="sensor-label">Humidity</div>
                        <div class="sensor-value" id="hum-${lockerId}">${lockerData.humidity || '--'}%</div>
                    </div>
                </div>
                
                ${isAdmin ? `
                <div class="mt-3">
                    <button class="btn btn-sm btn-outline-secondary edit-locker" data-id="${lockerId}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger delete-locker" data-id="${lockerId}">Delete</button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    container.appendChild(card);
    
    // Add event listeners for admin actions
    if (isAdmin) {
        card.querySelector('.edit-locker')?.addEventListener('click', () => editLocker(lockerId, lockerData));
        card.querySelector('.delete-locker')?.addEventListener('click', () => deleteLocker(lockerId));
    }
    
    // Update sensor values in real-time
    const tempElement = document.getElementById(`temp-${lockerId}`);
    const humElement = document.getElementById(`hum-${lockerId}`);
    
    database.ref(`lockers/${lockerId}/temperature`).on('value', (snapshot) => {
        tempElement.textContent = `${snapshot.val() || '--'}°C`;
    });
    
    database.ref(`lockers/${lockerId}/humidity`).on('value', (snapshot) => {
        humElement.textContent = `${snapshot.val() || '--'}%`;
    });
}

function loadUsers() {
    const usersRef = database.ref('users');
    
    usersRef.once('value').then((snapshot) => {
        usersTable.innerHTML = '';
        const users = snapshot.val();
        
        if (users) {
            Object.keys(users).forEach(userId => {
                const user = users[userId];
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${user.assignedLocker || 'None'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-user" data-id="${userId}">Edit</button>
                        <button class="btn btn-sm btn-outline-danger delete-user" data-id="${userId}">Delete</button>
                    </td>
                `;
                
                usersTable.appendChild(row);
                
                // Add event listeners
                row.querySelector('.edit-user').addEventListener('click', () => editUser(userId, user));
                row.querySelector('.delete-user').addEventListener('click', () => deleteUser(userId));
            });
        }
    });
}

function loadLockersForManagement() {
    const lockersRef = database.ref('lockers');
    
    lockersRef.once('value').then((snapshot) => {
        lockersTable.innerHTML = '';
        const lockers = snapshot.val();
        
        if (lockers) {
            Object.keys(lockers).forEach(lockerId => {
                const locker = lockers[lockerId];
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${lockerId}</td>
                    <td>${locker.status}</td>
                    <td>${locker.assignedUser || 'None'}</td>
                    <td>${locker.temperature || '--'}°C</td>
                    <td>${locker.humidity || '--'}%</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-locker" data-id="${lockerId}">Edit</button>
                        <button class="btn btn-sm btn-outline-danger delete-locker" data-id="${lockerId}">Delete</button>
                    </td>
                `;
                
                lockersTable.appendChild(row);
                
                // Add event listeners
                row.querySelector('.edit-locker').addEventListener('click', () => editLocker(lockerId, locker));
                row.querySelector('.delete-locker').addEventListener('click', () => deleteLocker(lockerId));
            });
        }
    });
}

function editLocker(lockerId, lockerData) {
    // Implement locker editing functionality
    alert(`Edit locker ${lockerId}`);
}

function deleteLocker(lockerId) {
    if (confirm(`Are you sure you want to delete locker ${lockerId}?`)) {
        database.ref('lockers/' + lockerId).remove()
            .then(() => {
                alert('Locker deleted successfully');
                loadAllLockers();
                loadLockersForManagement();
            })
            .catch(error => {
                alert('Error deleting locker: ' + error.message);
            });
    }
}

function editUser(userId, userData) {
    // Implement user editing functionality
    alert(`Edit user ${userId}`);
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        database.ref('users/' + userId).remove()
            .then(() => {
                alert('User deleted successfully');
                loadUsers();
            })
            .catch(error => {
                alert('Error deleting user: ' + error.message);
            });
    }
}

// Add new locker button
document.getElementById('add-locker-btn')?.addEventListener('click', () => {
    // Implement add new locker functionality
    alert('Add new locker');
});

// Check auth state on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        const userId = user.uid;
        database.ref('users/' + userId).once('value')
            .then((snapshot) => {
                const userData = snapshot.val();
                
                if (userData.role === 'admin') {
                    showAdminDashboard(userData);
                } else {
                    showUserDashboard(userData);
                }
            })
            .catch((error) => {
                console.error('Error getting user data:', error);
                logout();
            });
    } else {
        // User is signed out
        loginPage.classList.remove('d-none');
        userDashboard.classList.add('d-none');
        adminDashboard.classList.add('d-none');
    }
});
