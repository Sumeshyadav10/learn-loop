
import express from 'express';
import {
  signup,
  signin,
  sendOtp,
  loginWithOtp,
  refreshToken,
  logout,
  verifyOtp
} from '../controllers/authController.js';

const router = express.Router();

// Verify OTP (only needs email and otp)
router.post('/verify-otp', verifyOtp);
// Signup (register)
router.post('/signup', signup);
// Signin (login with password)
router.post('/signin', signin);
// Send OTP for login/signup
router.post('/send-otp', sendOtp);
// Login with OTP
router.post('/login-otp', loginWithOtp);
// Refresh JWT token
router.post('/refresh-token', refreshToken);
// Logout (signout)
router.post('/logout', logout);

export default router;
