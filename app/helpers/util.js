// import moment from 'moment';
const moment = require('moment');
const jwt = require("jsonwebtoken");
const { jwtVerify, importX509 } = require("jose");


function parseMultipartJsonFields(req, res, next) {
    if (
        req.headers['content-type']?.includes('multipart/form-data') &&
        req.body &&
        typeof req.body === 'object'
    ) {
        for (const key in req.body) {
            const value = req.body[key];
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                try {
                    req.body[key] = JSON.parse(value);
                } catch (err) {
                    console.warn(`Failed to parse req.body["${key}"]:`, err.message);
                }
            }
        }
    }
    next();
};

function formatDate(dateInput, format = 'DD-MM-YYYY') {
    const date = moment(dateInput);
    console.log('date', date)
    return date.isValid() ? date.format(format) : '';
}

function newFormatDate(dateInput, format = 'DD-MM-YYYY') {
    // 1. Try strict DD-MM-YYYY
    let date = moment(dateInput, 'DD-MM-YYYY', true);
    if (date.isValid()) return date.format(format);

    // 2. Try general moment parsing (ISO, YYYY-MM-DD, timestamps)
    date = moment(dateInput);
    return date.isValid() ? date.format(format) : '';
}


function isFutureReminder(reminder) {
    const combined = `${reminder.date} ${reminder.time}`;
    const reminderDateTime = moment(combined, 'DD-MM-YYYY hh:mm A');
    return reminderDateTime.isValid() && reminderDateTime.isAfter(moment());
};

const knownFormats = [
    moment.ISO_8601,     // ISO and UTC
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'MM-DD-YYYY',
    'DD/MM/YYYY',
    'YYYY/MM/DD',
    'MMM D, YYYY',        // May 1, 2025
    'D MMM YYYY',         // 1 May 2025
    'DD MMM YYYY',         // 1 May 2025
    'Do MMM YYYY',        // 1st May 2025
    'MMMM D, YYYY',       // May 1st, 2025
];

function parsedDate(dateInput) {
    let parsed = null;

    for (const fmt of knownFormats) {
        parsed = moment(dateInput, fmt, true);
        if (parsed.isValid()) return parsed;
    }

    parsed = moment(dateInput); // fallback
    return parsed.isValid() ? parsed : null;
}


const decodeTransaction = (token) => {
    const decoded = jwt.decode(token, { complete: true });

    console.log("HEADER:", decoded.header);
    console.log("PAYLOAD:", decoded.payload);

    return decoded.payload;
};

const decodeTransactionAndGetToken = (token) => {
    const decoded = jwt.decode(token, { complete: true });

    console.log("HEADER:", decoded.header);
    console.log("PAYLOAD:", decoded.payload);

    return decoded.header;
};


const verifyAndDecode = async (token) => {
  try {
    // 🔹 Split header
    const [headerB64] = token.split(".");
    const header = JSON.parse(
      Buffer.from(headerB64, "base64").toString("utf-8")
    );

    const cert = header.x5c?.[0];

    // ❌ No cert → invalid token
    if (!cert) {
      console.log("❌ Missing certificate");
      return null;
    }

    const pem = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;

    // 🔹 Convert to public key
    const publicKey = await importX509(pem, "ES256");

    // 🔹 Verify signature
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ["ES256"],
    });

    return payload;

  } catch (err) {
    console.log("❌ Verification failed:", err.message);
    return null;
  }
};


module.exports = {
    parseMultipartJsonFields,
    parsedDate,
    formatDate,
    isFutureReminder,
    newFormatDate,
    decodeTransaction,
    verifyAndDecode,
    decodeTransactionAndGetToken,
};