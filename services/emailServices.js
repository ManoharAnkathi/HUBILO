const nodemailer = require('nodemailer');
const OTPService = require("../services/otpServices"); // Your existing otp service

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        // Test connection
        this.verifyTransporter();
    }
    
    async verifyTransporter() {
        try {
            await this.transporter.verify();
            console.log('✓ Email transporter is ready');
        } catch (error) {
            console.error('✗ Email transporter error:', error.message);
        }
    }
    
    // Send OTP Email (uses existing OTPService)
    async sendOTPEmail(email, userType = 'user') {
        try {
            const otp = OTPService.generateOTP();
            await OTPService.sendEmailOTP(email, otp, userType);
            console.log(`✓ OTP email sent to ${email} (${userType})`);
            return otp;
        } catch (error) {
            console.error('✗ Error sending OTP email:', error.message);
            throw error;
        }
    }
    
    // Send Verification Email (for email verification links)
    async sendVerificationEmail(email, token, userType = 'user') {
        try {
            const verificationLink = `${process.env.APP_URL || 'http://localhost:8080'}/${userType}/verify-email/${token}`;
            
            let subject, html;
            
            if (userType === 'owner') {
                subject = 'Verify Your Owner Account - Hubilo';
                html = this.getOwnerVerificationEmail(verificationLink);
            } else {
                subject = 'Verify Your Account - Hubilo';
                html = this.getUserVerificationEmail(verificationLink);
            }
            
            await this.transporter.sendMail({
                from: `"Hubilo" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: subject,
                html: html,
                text: `Please verify your email by clicking this link: ${verificationLink}`
            });
            
            console.log(`✓ Verification email sent to ${email} (${userType})`);
            return true;
            
        } catch (error) {
            console.error('✗ Error sending verification email:', error.message);
            throw error;
        }
    }
    
    // Send Password Reset Email
    async sendPasswordResetEmail(email, token, userType = 'user') {
        try {
            const resetLink = `${process.env.APP_URL || 'http://localhost:8080'}/${userType}/reset-password/${token}`;
            
            let subject, html;
            
            if (userType === 'owner') {
                subject = 'Reset Your Owner Password - Hubilo';
                html = this.getOwnerPasswordResetEmail(resetLink);
            } else {
                subject = 'Reset Your Password - Hubilo';
                html = this.getUserPasswordResetEmail(resetLink);
            }
            
            await this.transporter.sendMail({
                from: `"Hubilo" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: subject,
                html: html,
                text: `Reset your password by clicking this link: ${resetLink}`
            });
            
            console.log(`✓ Password reset email sent to ${email} (${userType})`);
            return true;
            
        } catch (error) {
            console.error('✗ Error sending password reset email:', error.message);
            throw error;
        }
    }
    
    // Email Templates
    
    getUserVerificationEmail(verificationLink) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Hubilo!</h2>
                <p>Thank you for creating an account with us.</p>
                <p>Please click the link below to verify your email address:</p>
                <p><a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
                <p>Or copy and paste this link in your browser: ${verificationLink}</p>
                <p>This link will expire in 24 hours.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Hubilo Team</p>
            </div>
        `;
    }
    
    getOwnerVerificationEmail(verificationLink) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Hubilo Business!</h2>
                <p>Thank you for registering as a property owner.</p>
                <p>Please click the link below to verify your email address:</p>
                <p><a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
                <p>Or copy and paste this link in your browser: ${verificationLink}</p>
                <p>This link will expire in 24 hours.</p>
                <p>After verification, our team will review your business details.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Hubilo Business Team</p>
            </div>
        `;
    }
    
    getUserPasswordResetEmail(resetLink) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Reset Your Password</h2>
                <p>We received a request to reset your password.</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>Or copy and paste this link in your browser: ${resetLink}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Hubilo Team</p>
            </div>
        `;
    }
    
    getOwnerPasswordResetEmail(resetLink) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Reset Your Owner Password</h2>
                <p>We received a request to reset your owner account password.</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>Or copy and paste this link in your browser: ${resetLink}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Hubilo Business Team</p>
            </div>
        `;
    }
}

module.exports = new EmailService();