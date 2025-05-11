const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.setUserRole = functions.auth.user().onCreate(async (user) => {
  const email = user.email;
  const role = email === 'admin@lockers.com' ? 'admin' : 'user';
  try {
    await admin.auth().setCustomUserClaims(user.uid, { role });
    console.log(`Set role ${role} for user ${email}`);
    await admin.database().ref(`users/${user.uid}`).set({
      email: email,
      role: role,
      locker: email === 'admin@lockers.com' ? null : null
    });
    console.log(`Added user ${email} to RTDB`);
  } catch (error) {
    console.error('Error setting user role:', error);
  }
});
