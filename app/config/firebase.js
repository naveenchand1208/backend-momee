const admin = require("firebase-admin");
const serviceAccount = require("../config/firebase.json"); // adjust path

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

module.exports = admin;
