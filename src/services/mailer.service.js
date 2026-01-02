const Brevo = require('@getbrevo/brevo');
const AppError = require('../utils/AppError');

const apiInstance = new Brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const sendResetPasswordLink = async (userEmail, resetToken) => {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  const resetLink = `${process.env.BASE_URL}/reset-password?token=${resetToken}`;

  sendSmtpEmail.subject = 'Permintaan Reset Password - Short URL App';
  sendSmtpEmail.htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Permintaan Reset Password</h2>
        <p>Kami menerima permintaan untuk mereset password akun Anda.</p>
        <p>Silakan klik tombol di bawah ini untuk membuat password baru. Link ini hanya berlaku selama 15 menit.</p>
        <div style="margin: 20px 0;">
          <a href="${resetLink}" 
             style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
             Reset Password Sekarang
          </a>
        </div>
        <p>Jika tombol tidak berfungsi, salin dan tempel link berikut ke browser Anda:</p>
        <p>${resetLink}</p>
        <hr/>
        <p>Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
      </body>
    </html>`;
  sendSmtpEmail.sender = {
    name: 'Short URL App',
    email: process.env.EMAIL_SENDER,
  };
  sendSmtpEmail.to = [{ email: userEmail }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return true;
  } catch (error) {
    console.error('Brevo Error:', error);

    throw new AppError('Failed to send email. Please try again later.', 500);
  }
};

module.exports = { sendResetPasswordLink };
