# Forgot Password Feature Test Guide

## Testing the Complete Forgot Password Flow

### Prerequisites
1. Ensure the server is running with all environment variables set
2. Email configuration should be set up in `.env` file:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   ```

### Testing Steps

#### 1. Start the Frontend and Backend
```bash
# Backend
cd server
npm start

# Frontend (in another terminal)
cd Frontend
npm run dev
```

#### 2. Test Forgot Password Flow

**Step 1: Request OTP**
1. Go to `http://localhost:5173/login`
2. Click "Forgot password?"
3. Enter a registered email address
4. Click "Send OTP"
5. Check that you receive a success message
6. Verify OTP is stored in database (hashed)

**Step 2: Verify OTP**
1. Click "Verify OTP" button or navigate to `/verify-otp`
2. Enter the 6-digit OTP from your email
3. Click "Verify OTP"
4. Should redirect to reset password page

**Step 3: Reset Password**
1. Enter new password (minimum 6 characters)
2. Confirm password
3. Click "Reset Password"
4. Should show success message and redirect to login

**Step 4: Test New Password**
1. Try logging in with the new password
2. Should work successfully

### Security Features Implemented

✅ **OTP Hashing**: OTPs are hashed using bcrypt before storage
✅ **OTP Expiration**: 10-minute expiry with automatic cleanup
✅ **Rate Limiting**: Prevents spam requests
✅ **Attempt Limiting**: Max 3 failed OTP attempts
✅ **Secure Tokens**: JWT tokens for password reset flow
✅ **Audit Logging**: All actions are logged
✅ **Input Validation**: Joi validation for all inputs
✅ **Email Security**: Professional email templates

### Database Schema

#### OTP Model
```javascript
{
  email: String (required, indexed),
  otpHash: String (required, bcrypt hash),
  expiresAt: Date (required, auto-expire),
  isUsed: Boolean (default: false),
  attempts: Number (default: 0, max: 3)
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/forgot-password` | Send OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP and get reset token |
| POST | `/api/auth/reset-password` | Reset password with token |

### Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/forgot-password` | ForgotPassword | Email input for OTP |
| `/verify-otp` | VerifyOTP | 6-digit OTP verification |
| `/reset-password` | ResetPassword | New password form |

### Error Handling

- **Email not found**: Returns generic message for security
- **Invalid OTP**: Shows error with attempt count
- **Expired OTP**: Auto-cleanup and user notification
- **Rate limiting**: Prevents abuse
- **Token errors**: Clear error messages

### Testing Edge Cases

1. **Invalid email format** - Should show validation error
2. **Unregistered email** - Should show generic success message
3. **Wrong OTP** - Should show error and decrement attempts
4. **Expired OTP** - Should show expiry message
5. **Password mismatch** - Should show validation error
6. **Weak password** - Should show strength indicator
7. **Resend OTP** - Should work after cooldown period

### Production Considerations

- Configure real email service (Gmail, SendGrid, etc.)
- Set proper CORS origins
- Configure Redis for caching if needed
- Monitor OTP usage and abuse
- Set up proper logging and monitoring
