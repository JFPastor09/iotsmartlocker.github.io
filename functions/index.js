const functions = require('firebase-functions');
   const admin = require('firebase-admin');

   admin.initializeApp();

   exports.setUserRole = functions.auth.user().onCreate(async (user) => {
     console.log('Function triggered for user:', user.uid);
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

     console.log('Setting role:', role, 'and locker:', locker, 'for email:', email);

     try {
       console.log('Setting custom claims for UID:', user.uid);
       await admin.auth().setCustomUserClaims(user.uid, { role });
       console.log('Custom claims set successfully');

       console.log('Writing to RTDB at /users/', user.uid);
       await admin.database().ref(`users/${user.uid}`).set({
         email: email,
         role: role,
         locker: locker
       });
       console.log('RTDB write successful');

       console.log(`Set role ${role} for user ${email}`);
       return null;
     } catch (error) {
       console.error('Error setting user role:', error);
       throw new functions.https.HttpsError('internal', 'Failed to set user role');
     }
   });
