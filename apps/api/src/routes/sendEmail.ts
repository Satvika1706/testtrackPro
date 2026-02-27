import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (
  email: string,
  token: string
) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Verify your TestTrackPro Account",
    html: `
      <h3>Email Verification</h3>
      <a href="${verificationLink}">Verify Email</a>
    `,
  });
};