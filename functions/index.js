const functions = require('firebase-functions');
     const admin = require('firebase-admin');
     admin.initializeApp();

     exports.setUserRole = functions.auth.user().onCreate((user) => {
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
       return admin.auth().setCustomUserClaims(user.uid, { role }).then(() => {
         return admin.database().ref(`/users/${user.uid}`).set({
           email,
           role,
           locker
         });
       });
     });
