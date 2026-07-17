// mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'dev.momee@gmail.com', // replace with your email
    pass: 'ptay mkkq abmj poqt',    // replace with your app password
  },
});



/**
 * Send OTP email
 * @param {string} toEmail - Receiver's email
 * @returns {number} otp - The OTP sent
 */
const sendEmail = async (toEmail, otp) => {
  if(toEmail !== undefined){
  const mailOptions = {
    from: 'dev.momee@gmail.com',
    to: toEmail,
    subject: 'Email Verfication OTP Code',
    text: `Your OTP code is: ${otp}`, 
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${toEmail}: ${otp}`);
    return otp;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
};

module.exports = sendEmail; 
