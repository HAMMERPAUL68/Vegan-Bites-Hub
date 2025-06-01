import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { sendEmail } from "./emailService";
import { nanoid } from "nanoid";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function generateResetToken(): Promise<string> {
  return nanoid(32);
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `https://veganbiteshub.com/reset-password?token=${resetToken}`;
  
  const emailContent = {
    to: email,
    from: "noreply@veganbiteshub.com",
    subject: "Reset Your Password - Vegan Bites Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4ade80;">Reset Your Password</h2>
        <p>You requested a password reset for your Vegan Bites Hub account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #4ade80; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Reset Password</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">Vegan Bites Hub - Community-driven vegan recipes</p>
      </div>
    `,
    text: `
      Reset Your Password - Vegan Bites Hub
      
      You requested a password reset for your Vegan Bites Hub account.
      
      Click this link to reset your password: ${resetUrl}
      
      This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
      
      Vegan Bites Hub - Community-driven vegan recipes
    `
  };

  return await sendEmail(emailContent);
}