const nodemailer = require('nodemailer');

let transporter;

const createTransporter = () => {
  const { EMAIL_USER, EMAIL_PASS } = process.env;

  if (EMAIL_USER && EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail', // or any other email service
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  }

  console.warn('[Mailer] EMAIL_USER or EMAIL_PASS environment variables missing. Falling back to console logging.');
  return nodemailer.createTransport({
    jsonTransport: true
  });
};

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

const sendMail = async ({ to, subject, text, html }) => {
  const mailTransporter = getTransporter();
  const from = process.env.EMAIL_FROM || `PIQUI <${process.env.EMAIL_USER}>`;

  const payload = {
    from,
    to,
    subject,
    text,
    html
  };

  if (mailTransporter.options.jsonTransport) {
    console.log('[Mailer] Email payload:', payload);
    return { accepted: [to], message: 'Email logged (development mode)' };
  }

  return mailTransporter.sendMail(payload);
};

module.exports = {
  sendMail
};