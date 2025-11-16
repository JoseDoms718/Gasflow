const OtpEmailTemplate = ({ name, otpCode }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gasflow - OTP Verification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f9f9f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      flex-direction: column; /* stack logo above text */
      align-items: center;    /* center horizontally */
      gap: 10px;
      margin-bottom: 30px;
    }
    .header img {
      height: 50px;
    }
    .header h1 {
      color: #0d6efd;
      margin: 0;
      font-size: 28px;
    }
    .content {
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
      text-align: center;
    }
    .otp {
      display: inline-block;
      margin: 20px 0;
      padding: 15px 40px;
      font-size: 28px;
      font-weight: bold;
      letter-spacing: 4px;
      background-color: #0d6efd;
      color: #ffffff;
      border-radius: 8px;
    }
    .footer {
      font-size: 12px;
      color: #777777;
      margin-top: 30px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="cid:logo" alt="Gasflow Logo" />
      <h1>Gasflow</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>We received a request to verify your Gasflow customer account.</p>
      <p>To complete the verification, please use the following One-Time Password (OTP):</p>
      <div class="otp">${otpCode}</div>
      <p>This OTP will expire in 5 minutes.</p>
      <p>If you did not request this verification, please ignore this email.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

module.exports = OtpEmailTemplate;
