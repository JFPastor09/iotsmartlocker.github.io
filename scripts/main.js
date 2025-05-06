import { auth } from './firebase-config.js';
import { loginUser } from './auth.js';
import { initializeDashboard } from './dashboard.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await loginUser(email, password);
    } catch (error) {
        const errorMessage = getLoginErrorMessage(error.code);
        showLoginError(errorMessage);
    }
});

auth.onAuthStateChanged(user => {
    const loginSection = document.getElementById('login-section');
    const dashboard = document.getElementById('dashboard');
    
    if (user) {
        loginSection.classList.add('d-none');
        dashboard.classList.remove('d-none');
        initializeDashboard();
        checkAdminStatus(user.uid);
    } else {
        loginSection.classList.remove('d-none');
        dashboard.classList.add('d-none');
    }
});

// Add other main application logic...
