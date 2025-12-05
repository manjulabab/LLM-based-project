const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendRfpEmail(to, subject, text, attachments = []) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM || your_email,
    to,
    subject,
    text,
    attachments
  });
}

module.exports = { sendRfpEmail };
