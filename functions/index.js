const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.setUserRole = functions.auth.user().onCreate(async (user) => {
  const email = user.email;

  let role = 'user';
  let locker = null;

  if (email === 'admin@lockers.com') {
    role = 'admin';
  } else if (email === 'user1@lockers.com') {
    locker = 'locker1';
  } else if (email === 'user2@lockers.com') {
    locker = 'locker2';
  } else if (email === 'user3@lockers.com') {
    locker = 'locker3';
  }

  try {
    await admin.auth().setCustomUserClaims(user.uid, { role });

    await admin.database().ref(`users/${user.uid}`).set({
      email: email,
      role: role,
      locker: locker
    });

    console.log(`Set role ${role} for user ${email}`);
    return null;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw new functions.https.HttpsError('internal', 'Failed to set user role');
  }
});
