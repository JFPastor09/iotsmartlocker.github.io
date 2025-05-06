import { logoutUser } from './auth.js';

export const handleLogout = async () => {
    try {
        await logoutUser();
        window.location.href = '/';
    } catch (error) {
        console.error("Logout error:", error);
    }
};
