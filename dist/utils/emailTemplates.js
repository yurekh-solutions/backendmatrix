"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectionEmailTemplate = exports.approvalEmailTemplate = void 0;
const approvalEmailTemplate = (companyName, dashboardUrl) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #D2691E 0%, #8B4513 100%); color: white; padding: 30px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #D2691E; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Supplier Application Approved!</h1>
    </div>
    <div class="content">
      <h2>Congratulations ${companyName}!</h2>
      <p>We are pleased to inform you that your supplier application has been <strong>approved</strong>.</p>
      <p>You can now access your supplier dashboard to manage your profile, view orders, and track business activities.</p>
      <a href="${dashboardUrl}" class="button">Access Your Dashboard</a>
      <p style="margin-top: 30px;">If you have any questions, feel free to contact our support team.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MatrixYuvraj. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
exports.approvalEmailTemplate = approvalEmailTemplate;
const rejectionEmailTemplate = (companyName, reason, reapplyUrl) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 30px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .reason { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #D2691E; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Supplier Application Update</h1>
    </div>
    <div class="content">
      <h2>Dear ${companyName},</h2>
      <p>Thank you for your interest in becoming a supplier partner with MatrixYuvraj.</p>
      <p>After careful review, we regret to inform you that we cannot proceed with your application at this time.</p>
      <div class="reason">
        <strong>Reason for rejection:</strong><br>
        ${reason}
      </div>
      <p>You are welcome to reapply after addressing the mentioned concerns.</p>
      <a href="${reapplyUrl}" class="button">Reapply Now</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MatrixYuvraj. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
exports.rejectionEmailTemplate = rejectionEmailTemplate;
