const OtpEmailTemplate = ({ name, otpCode }) => `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  
  <!-- Header -->
  <div style="background-color: #0047ab; padding: 20px; text-align: center;">
    <img src="cid:logoWhite" alt="Gasflow Logo" style="height: 50px; display: block; margin: auto;" />
    <h1 style="color: #fff; font-size: 22px; margin: 10px 0 0;">Gasflow</h1>
  </div>

  <!-- Body -->
  <div style="padding: 30px; text-align: center;">
    <h2 style="color: #0047ab; font-size: 20px; margin-bottom: 15px;">Hi ${name},</h2>

    <p style="margin-bottom: 15px;">
      We received a request to verify your Gasflow account. Use the OTP below to complete verification:
    </p>

    <div style="display: inline-block; margin: 20px 0; padding: 15px 40px; font-size: 28px; font-weight: bold; letter-spacing: 4px; background-color: #0d6efd; color: #fff; border-radius: 8px;">
      ${otpCode}
    </div>

    <p style="margin-bottom: 15px;">This OTP will expire in 5 minutes.</p>
    <p style="margin-bottom: 0;">If you did not request this verification, please ignore this email.</p>
  </div>

  <!-- Footer -->
  <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #555;">
    &copy; ${new Date().getFullYear()} Gasflow. All rights reserved.
  </div>
</div>
`;

module.exports = OtpEmailTemplate;
