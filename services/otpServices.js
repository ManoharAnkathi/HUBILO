const nodemailer = require('nodemailer');
const crypto = require('crypto');

class OTPService {
    constructor() {
        // Email transporter
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        // Test email configuration
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
    
    // Send OTP email
    async sendEmailOTP(email, otp, userType = 'user') {
        try {
            let subject, html;
            
            switch(userType) {
                case 'owner':
                    subject = 'Verify Your Owner Account - Hubilo';
                    html = this.getOwnerOTPEmail(otp);
                    break;
                case 'admin':
                    subject = 'Verify Your Admin Account - Hubilo';
                    html = this.getAdminOTPEmail(otp);
                    break;
                default:
                    subject = 'Verify Your Account - Hubilo';
                    html = this.getUserOTPEmail(otp);
            }
            
            await this.transporter.sendMail({
                from: `"Hubilo" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: subject,
                html: html,
                text: `Your verification OTP is: ${otp}. This OTP will expire in 10 minutes.`
            });
            
            console.log(`✓ OTP sent to ${email} (${userType})`);
            return true;
            
        } catch (error) {
            console.error('✗ Error sending OTP email:', error.message);
            throw new Error('Failed to send OTP email');
        }
    }
    
    // Simplified sendOTP method (generates and sends OTP)
    async sendOTP(email, userType = 'user') {
        try {
            const otp = this.generateOTP();
            await this.sendEmailOTP(email, otp, userType);
            console.log(`✓ OTP sent to ${email} (${userType})`);
            return otp;
        } catch (error) {
            console.error('✗ Error in sendOTP:', error.message);
            throw error;
        }
    }

    
    
    getUserOTPEmail(otp) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Hubilo!</h2>
                <p>Thank you for creating an account with us.</p>
                <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 18px;">Your verification code is:</p>
                    <h1 style="color: #dc3545; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Hubilo Team</p>
            </div>
        `;
    }
    
    getOwnerOTPEmail(otp) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Hubilo Business!</h2>
                <p>Thank you for registering as a property owner.</p>
                <div style="background: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 18px;">Your verification code is:</p>
                    <h1 style="color: #198754; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>After verification, our team will review your business details.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Hubilo Business Team</p>
            </div>
        `;
    }
    
    
    generateOTP() {
        // Generate 6-digit OTP
        return crypto.randomInt(100000, 999999).toString();
    }
    
    generateVerificationToken() {
        // Generate random token for email verification links
        return crypto.randomBytes(32).toString('hex');
    }
    
    // OTP verification utility
    verifyOTP(email, enteredOTP, storedOTP) {
        if (!storedOTP || !enteredOTP) {
            return false;
        }
        return storedOTP === enteredOTP;
    }
    
    // Session-based OTP storage with callback
    storeOTPInSession(req, email, otp, userType = 'user') {
        return new Promise((resolve, reject) => {
            req.session.otpData = {
                email: email,
                otp: otp,
                userType: userType,
                timestamp: Date.now()
            };
            
            // Save session explicitly
            req.session.save((err) => {
                if (err) {
                    console.error("Error saving session:", err);
                    reject(err);
                } else {
                    console.log("OTP stored in session for:", email);
                    resolve(true);
                }
            });
        });
    }
    getOTPFromSession(req) {
        return req.session.otpData || null;
    }
    
    validateOTPFromSession(req, enteredOTP) {
        const otpData = req.session.otpData;
        
        if (!otpData) {
            return { valid: false, message: 'No OTP found in session' };
        }
        
        // Check if OTP is expired (10 minutes)
        const currentTime = Date.now();
        const otpAge = currentTime - otpData.timestamp;
        const expirationTime = 10 * 60 * 1000; // 10 minutes in milliseconds
        
        if (otpAge > expirationTime) {
            delete req.session.otpData;
            return { valid: false, message: 'OTP has expired' };
        }
        
        if (otpData.otp !== enteredOTP) {
            return { valid: false, message: 'Invalid OTP' };
        }
        
        return { valid: true, email: otpData.email, userType: otpData.userType };
    }
    
    clearOTPFromSession(req) {
        delete req.session.otpData;
        return true;
    }
    // Add these methods to the OTPService class (add them before the module.exports line)

    // Send booking confirmation to user
    async sendBookingConfirmationToUser(email, bookingDetails) {
        try {
            const subject = 'Booking Confirmed - Hubilo';
            
            await this.transporter.sendMail({
                from: `"Hubilo Bookings" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: subject,
                html: this.getUserBookingEmail(bookingDetails),
                text: this.getUserBookingText(bookingDetails)
            });
            
            console.log(`✓ Booking confirmation sent to user: ${email}`);
            return true;
            
        } catch (error) {
            console.error('✗ Error sending booking confirmation to user:', error.message);
            throw new Error('Failed to send booking confirmation email');
        }
    }

    // Send booking notification to owner
    async sendBookingNotificationToOwner(email, bookingDetails, userDetails) {
        try {
            const subject = `New Booking - ${bookingDetails.listingTitle}`;
            
            await this.transporter.sendMail({
                from: `"Hubilo Bookings" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: subject,
                html: this.getOwnerBookingEmail(bookingDetails, userDetails),
                text: this.getOwnerBookingText(bookingDetails, userDetails)
            });
            
            console.log(`✓ Booking notification sent to owner: ${email}`);
            return true;
            
        } catch (error) {
            console.error('✗ Error sending booking notification to owner:', error.message);
            throw new Error('Failed to send booking notification email');
        }
    }

    // User booking confirmation email template
    getUserBookingEmail(bookingDetails) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #198754; margin-bottom: 10px;">🎉 Booking Confirmed!</h1>
                    <p style="color: #666;">Your booking has been successfully confirmed.</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #333; margin-bottom: 15px;">Booking Details</h2>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Booking ID:</strong> 
                        <span style="color: #333; font-weight: bold;">${bookingDetails.bookingId}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Property:</strong> 
                        <span style="color: #333;">${bookingDetails.listingTitle}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Location:</strong> 
                        <span style="color: #333;">${bookingDetails.location}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Check-in:</strong> 
                        <span style="color: #333;">${bookingDetails.checkIn}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Check-out:</strong> 
                        <span style="color: #333;">${bookingDetails.checkOut}</span>
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                        <strong style="color: #555;">Total Amount:</strong> 
                        <span style="color: #198754; font-size: 18px; font-weight: bold;">$${bookingDetails.totalAmount}</span>
                    </div>
                </div>
                
                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #0d6efd; margin-bottom: 10px;">Next Steps</h3>
                    <p style="color: #333; margin-bottom: 5px;">1. Save this booking ID for future reference</p>
                    <p style="color: #333; margin-bottom: 5px;">2. Contact the owner for check-in details</p>
                    <p style="color: #333; margin-bottom: 5px;">3. Review your booking in your account dashboard</p>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
                    <p>Need help? Contact our support team at support@hubilo.com</p>
                    <p>© ${new Date().getFullYear()} Hubilo. All rights reserved.</p>
                </div>
            </div>
        `;
    }

    // Owner booking notification email template
    getOwnerBookingEmail(bookingDetails, userDetails) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #0d6efd; margin-bottom: 10px;">📅 New Booking Received!</h1>
                    <p style="color: #666;">You have received a new booking for your property.</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #333; margin-bottom: 15px;">Booking Details</h2>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Booking ID:</strong> 
                        <span style="color: #333; font-weight: bold;">${bookingDetails.bookingId}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Property:</strong> 
                        <span style="color: #333;">${bookingDetails.listingTitle}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Booking Date:</strong> 
                        <span style="color: #333;">${bookingDetails.bookingDate}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Check-in:</strong> 
                        <span style="color: #333;">${bookingDetails.checkIn}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #555;">Check-out:</strong> 
                        <span style="color: #333;">${bookingDetails.checkOut}</span>
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                        <strong style="color: #555;">Total Amount:</strong> 
                        <span style="color: #198754; font-size: 18px; font-weight: bold;">$${bookingDetails.totalAmount}</span>
                    </div>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #856404; margin-bottom: 10px;">Guest Information</h3>
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #555;">Name:</strong> 
                        <span style="color: #333;">${userDetails.name}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #555;">Email:</strong> 
                        <span style="color: #333;">${userDetails.email}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #555;">Phone:</strong> 
                        <span style="color: #333;">${userDetails.phone || 'Not provided'}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #555;">Guests:</strong> 
                        <span style="color: #333;">${bookingDetails.guests}</span>
                    </div>
                </div>
                
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #155724; margin-bottom: 10px;">Action Required</h3>
                    <p style="color: #333; margin-bottom: 5px;">1. Review the booking details</p>
                    <p style="color: #333; margin-bottom: 5px;">2. Contact the guest for any clarifications</p>
                    <p style="color: #333; margin-bottom: 5px;">3. Prepare the property for check-in</p>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
                    <p>Manage this booking from your owner dashboard</p>
                    <p>© ${new Date().getFullYear()} Hubilo. All rights reserved.</p>
                </div>
            </div>
        `;
    }

    // Plain text versions for email clients that don't support HTML
    getUserBookingText(bookingDetails) {
        return `
    Booking Confirmed!
    ==================

    Your booking has been successfully confirmed.

    Booking Details:
    - Booking ID: ${bookingDetails.bookingId}
    - Property: ${bookingDetails.listingTitle}
    - Location: ${bookingDetails.location}
    - Check-in: ${bookingDetails.checkIn}
    - Check-out: ${bookingDetails.checkOut}
    - Total Amount: $${bookingDetails.totalAmount}

    Next Steps:
    1. Save this booking ID for future reference
    2. Contact the owner for check-in details
    3. Review your booking in your account dashboard

    Need help? Contact support@hubilo.com

    © ${new Date().getFullYear()} Hubilo
        `;
    }

    getOwnerBookingText(bookingDetails, userDetails) {
        return `
    New Booking Received!
    =====================

    You have received a new booking for your property.

    Booking Details:
    - Booking ID: ${bookingDetails.bookingId}
    - Property: ${bookingDetails.listingTitle}
    - Booking Date: ${bookingDetails.bookingDate}
    - Check-in: ${bookingDetails.checkIn}
    - Check-out: ${bookingDetails.checkOut}
    - Total Amount: $${bookingDetails.totalAmount}
    - Guests: ${bookingDetails.guests}

    Guest Information:
    - Name: ${userDetails.name}
    - Email: ${userDetails.email}
    - Phone: ${userDetails.phone || 'Not provided'}

    Action Required:
    1. Review the booking details
    2. Contact the guest for any clarifications
    3. Prepare the property for check-in

    Manage this booking from your owner dashboard.

    © ${new Date().getFullYear()} Hubilo
        `;
    }
}


module.exports = new OTPService();