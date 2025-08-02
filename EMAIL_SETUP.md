# Email Configuration Guide

## Problem
SMTP connection timeout errors when trying to send emails:
```
SMTP connection error: Error: connect ETIMEDOUT 66.102.1.108:465
```

## Solution
The email configuration has been improved with better error handling, timeout settings, and multiple SMTP options.

## Environment Variables

### Required Variables
```env
# Email Configuration
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Optional Variables
```env
# Custom SMTP Server (if not using Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Environment
NODE_ENV=production
```

## Email Provider Setup

### 1. Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use App Password** in your `.env` file:
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-digit-app-password
   ```

### 2. Other Email Providers

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

#### Custom SMTP Server
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Testing Email Configuration

### 1. Test SMTP Connection
```bash
# Run the test script
node test-email.js
```

### 2. Manual Test
```javascript
// In your application
import { verifySMTPConnection } from './src/utils/email.js';

// Test connection
const isConnected = await verifySMTPConnection();
console.log('SMTP Connected:', isConnected);
```

## Troubleshooting

### Common Issues

#### 1. Connection Timeout
- **Cause**: Firewall blocking SMTP ports
- **Solution**: 
  - Try port 587 instead of 465
  - Check if your network allows SMTP traffic
  - Use a different email provider

#### 2. Authentication Failed
- **Cause**: Wrong credentials or 2FA not enabled
- **Solution**:
  - Double-check SMTP_USER and SMTP_PASS
  - For Gmail, use App Password, not regular password
  - Enable 2-Factor Authentication

#### 3. Rate Limiting
- **Cause**: Too many emails sent
- **Solution**:
  - Gmail: 500 emails/day limit
  - Wait before sending more emails
  - Use email service like SendGrid for high volume

#### 4. TLS/SSL Issues
- **Cause**: Certificate problems
- **Solution**:
  - Try `SMTP_SECURE=false` for port 587
  - Try `SMTP_SECURE=true` for port 465
  - Check if your email provider supports TLS

### Debug Steps

1. **Check Environment Variables**:
   ```bash
   echo $SMTP_USER
   echo $SMTP_PASS
   ```

2. **Test with Different Ports**:
   ```env
   # Try port 587
   SMTP_PORT=587
   SMTP_SECURE=false
   
   # Or try port 465
   SMTP_PORT=465
   SMTP_SECURE=true
   ```

3. **Use Different Email Provider**:
   - Try Gmail, Outlook, or Yahoo
   - Consider email services like SendGrid, Mailgun

4. **Check Network**:
   - Ensure SMTP ports are not blocked
   - Try from different network

## Production Recommendations

### 1. Use Email Services
For production, consider using dedicated email services:
- **SendGrid**: 100 emails/day free
- **Mailgun**: 5,000 emails/month free
- **Amazon SES**: Very cheap for high volume

### 2. Environment-Specific Settings
```env
# Development
NODE_ENV=development
SMTP_USER=dev-email@gmail.com

# Production
NODE_ENV=production
SMTP_USER=prod-email@gmail.com
```

### 3. Error Handling
The updated email utility includes:
- ✅ Connection pooling
- ✅ Timeout settings
- ✅ Error logging
- ✅ Graceful failure handling
- ✅ Production-safe error handling

## Test Script

Create `test-email.js` to test your email configuration:

```javascript
import { verifySMTPConnection, sendCustomEmail } from './src/utils/email.js';

async function testEmail() {
    console.log('Testing email configuration...');
    
    // Test connection
    const isConnected = await verifySMTPConnection();
    
    if (isConnected) {
        // Test sending email
        try {
            await sendCustomEmail(
                'test@example.com',
                'Test Email',
                '<h1>Test Email</h1><p>This is a test email.</p>'
            );
            console.log('✅ Test email sent successfully!');
        } catch (error) {
            console.error('❌ Test email failed:', error.message);
        }
    }
}

testEmail();
```

## Quick Fix Checklist

- [ ] Enable 2-Factor Authentication on Gmail
- [ ] Generate App Password for Gmail
- [ ] Update `.env` with correct credentials
- [ ] Test with different ports (587 vs 465)
- [ ] Check firewall/network settings
- [ ] Try different email provider if needed
- [ ] Use email service for production 