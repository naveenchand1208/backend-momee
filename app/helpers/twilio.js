const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = new twilio(accountSid, authToken);

/**
 * Send SMS to a list of users
 * @param {Array} users - List of { userName, phone }
 * @param {String} messageTemplate - Template string with ${userName}
 */
const sendTextSMS = async (users, messageTemplate, userName) => {
  const results = [];
        console.log('users', users)

  for (const user of users) {
    const message = messageTemplate.replace('${userName}', user.userName).replace('${user}', userName);

    const response = await client.messages.create({
      body: message,
      from: fromNumber,
      to: user.phone
    });

    results.push({
      user: user.userName,
      to: user.phone,
      sid: response.sid,
      status: response.status || error.status || 'failed'
    });
  }

  return results;
};

module.exports = {
  sendTextSMS
};
