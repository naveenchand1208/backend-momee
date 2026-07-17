const axios = require("axios");

/**
 * Send OTP to user using Nettyfish SMS API
 * @param {string} mobile - User's mobile number with country code (e.g. "919876543210")
 * @param {string} otp - OTP code
 */
async function sendMobileOtp(mobile, otp) {
  try {
    const message = `Dear Customer, your login OTP is ${otp}. – CODEIN TECHNOLOGIES`;

    // build query parameters
    const params = new URLSearchParams({
      user: process.env.NETTYFISH_USER,       // Your Nettyfish username
      password: process.env.NETTYFISH_PASS,   // Your Nettyfish password
      senderid: process.env.NETTYFISH_SENDER, // Your registered sender ID
      channel: "2",
      DCS: "0",
      flashsms: "0",
      number: mobile,
      text: message,
      route: "1",
      peid: process.env.NETTYFISH_ENTITYID, // your DLT Entity ID
      templateid: process.env.NETTYFISH_TEMPLATEID 
    });

    // const url = `https://smsapi-nettyfish.com/api/mt/SendSMS?${params.toString()}`;
    const url = `http://retailsms.nettyfish.com/api/mt/SendSMS?${params.toString()}`;

    const { data } = await axios.get(url);
    // console.log(" OTP Sent:", data);
    return data;
  } catch (err) {
    // console.error(" Nettyfish Send Error:", err.message);
    throw err;
  }
}

module.exports = { sendMobileOtp };
