import { verifySMTPConnection, sendCustomEmail } from './src/utils/email.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmailConfiguration() {
    console.log('🧪 Testing Email Configuration...\n');
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ Missing'}`);
    console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set' : '❌ Missing'}`);
    console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'smtp.gmail.com (default)'}`);
    console.log(`SMTP_PORT: ${process.env.SMTP_PORT || '587 (default)'}`);
    console.log(`SMTP_SECURE: ${process.env.SMTP_SECURE || 'false (default)'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}\n`);
    
    // Test SMTP connection
    console.log('🔗 Testing SMTP Connection...');
    try {
        const isConnected = await verifySMTPConnection();
        
        if (isConnected) {
            console.log('✅ SMTP connection successful!\n');
            
            // Test sending email (optional)
            const testEmail = process.env.TEST_EMAIL;
            if (testEmail) {
                console.log(`📧 Testing email sending to ${testEmail}...`);
                try {
                    await sendCustomEmail(
                        testEmail,
                        'Test Email - Solar Store',
                        `
                        <h2>Test Email from Solar Store</h2>
                        <p>This is a test email to verify your email configuration.</p>
                        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
                        <hr>
                        <p><em>If you received this email, your email configuration is working correctly!</em></p>
                        `
                    );
                    console.log('✅ Test email sent successfully!');
                } catch (error) {
                    console.error('❌ Test email failed:', error.message);
                }
            } else {
                console.log('ℹ️  Set TEST_EMAIL environment variable to test email sending');
            }
        } else {
            console.log('❌ SMTP connection failed. Check the error messages above.\n');
            
            // Provide troubleshooting tips
            console.log('🔧 Troubleshooting Steps:');
            console.log('1. Check your .env file for correct SMTP credentials');
            console.log('2. For Gmail: Enable 2FA and use App Password');
            console.log('3. Try different ports: 587 (TLS) or 465 (SSL)');
            console.log('4. Check if your network/firewall blocks SMTP ports');
            console.log('5. Try a different email provider (Outlook, Yahoo)');
            console.log('6. Consider using email services like SendGrid for production');
        }
    } catch (error) {
        console.error('💥 Unexpected error during testing:', error.message);
    }
}

// Run the test
testEmailConfiguration().catch(console.error); 