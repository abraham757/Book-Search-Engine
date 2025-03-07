// server/routes/api/user-routes.ts
import express from 'express';
import User from '../../models/User.js'; // Import directly from the User model file
import { signToken } from '../../services/auth.js';

const router = express.Router();

// create a user, sign a token, and send it back
router.post('/', async (req: { body: any }, res: any) => {
  try {
    const userData = await User.create(req.body);

    if (!userData) {
      return res.status(400).json({ message: 'Something went wrong!' });
    }

    // Create a token
    const token = signToken(userData.username as string, userData._id as string, userData.email as string);

    // Return the token and user data
    return res.json({
      token,
      user: userData
    });
  } catch (err) {
    console.error('User creation error:', err);
    
    // Check for MongoDB duplicate key error (code 11000)
    if ((err as any).code === 11000) {
      return res.status(400).json({ message: 'This email or username is already in use.' });
    }
    
    // Check for validation errors
    if ((err as Error).name === 'ValidationError') {
      const messages = Object.values((err as any).errors).map((val: any) => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    return res.status(500).json({ message: 'An error occurred during signup.' });
  }
});

// login a user, sign a token, and send it back
router.post('/login', async (req: { body: { email: any; password: any } }, res: any) => {
  try {
    const userData = await User.findOne({ email: req.body.email });
    if (!userData) {
      return res.status(400).json({ message: "Can't find this user" });
    }

    const correctPw = await userData.isCorrectPassword(req.body.password);

    if (!correctPw) {
      return res.status(400).json({ message: 'Wrong password!' });
    }

    const token = signToken(userData.username as string, userData._id as string, userData.email as string);
    res.json({
      token,
      user: userData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred during login.' });
  }
});

// Export using ES Module syntax
export default router;