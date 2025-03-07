import type { Request, Response } from 'express';
// import user model
import User from '../models/User.js';
// import sign token function from auth
import { signToken } from '../services/auth.js';

// get a single user by either their id or their username
export const getSingleUser = async (req: Request, res: Response) => {
  try {
    const foundUser = await User.findOne({
      $or: [{ _id: req.user ? req.user._id : req.params.id }, { username: req.params.username }],
    });

    if (!foundUser) {
      return res.status(404).json({ message: 'Cannot find a user with this id!' });
    }

    // Remove sensitive information before sending response
    const safeUser = {
      username: foundUser.username,
      email: foundUser.email,
      _id: foundUser._id,
      savedBooks: foundUser.savedBooks
    };

    return res.json(safeUser);
  } catch (err) {
    console.error('Error in getSingleUser:', err);
    return res.status(500).json({ 
      message: 'An error occurred while fetching user information.',
      error: (err as Error).message
    });
  }
};

// create a user, sign a token, and send it back (to client/src/components/SignUpForm.js)
export const createUser = async (req: Request, res: Response) => {
  try {
    // Check if user with this email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email: req.body.email }, { username: req.body.username }]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'A user with that email or username already exists!' 
      });
    }
    
    // Create new user
    const user = await User.create(req.body);

    if (!user) {
      return res.status(400).json({ message: 'Something went wrong creating the user!' });
    }
    
    // Generate JWT token - don't pass the password to the token
    const token = signToken(user.username as string, user._id as string, user.email as string);
    
    // Remove password from the user object before sending it back
    const safeUser = {
      username: user.username,
      email: user.email,
      _id: user._id,
      savedBooks: user.savedBooks
    };

    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Error in createUser:', err);
    
    // Check for MongoDB duplicate key error
    if ((err as any).code === 11000) {
      return res.status(400).json({ 
        message: 'This email or username is already in use.' 
      });
    }
    
    // Check for validation errors
    if ((err as any).name === 'ValidationError') {
      const messages = Object.values((err as any).errors).map((error: any) => error.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    return res.status(500).json({ 
      message: 'An error occurred during signup.',
      error: (err as Error).message
    });
  }
};

// login a user, sign a token, and send it back (to client/src/components/LoginForm.js)
// {body} is destructured req.body
export const login = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ 
      $or: [{ username: req.body.username }, { email: req.body.email }] 
    });
    
    if (!user) {
      return res.status(400).json({ message: "Can't find this user" });
    }

    const correctPw = await user.isCorrectPassword(req.body.password);

    if (!correctPw) {
      return res.status(400).json({ message: 'Wrong password!' });
    }
    
    // Don't pass the password to the token
    const token = signToken(user.username as string, user._id as string, user.email as string);
    
    // Remove sensitive information before sending response
    const safeUser = {
      username: user.username,
      email: user.email,
      _id: user._id,
      savedBooks: user.savedBooks
    };
    
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Error in login:', err);
    return res.status(500).json({ 
      message: 'An error occurred during login.',
      error: (err as Error).message
    });
  }
};

// save a book to a user's `savedBooks` field by adding it to the set (to prevent duplicates)
// user comes from `req.user` created in the auth middleware function
export const saveBook = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $addToSet: { savedBooks: req.body } },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "Couldn't find user with this id!" });
    }
    
    // Remove sensitive information before sending response
    const safeUser = {
      username: updatedUser.username,
      email: updatedUser.email,
      _id: updatedUser._id,
      savedBooks: updatedUser.savedBooks
    };
    
    return res.json(safeUser);
  } catch (err) {
    console.error('Error in saveBook:', err);
    return res.status(500).json({ 
      message: 'An error occurred while saving the book.',
      error: (err as Error).message
    });
  }
};

// remove a book from `savedBooks`
export const deleteBook = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $pull: { savedBooks: { bookId: req.params.bookId } } },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "Couldn't find user with this id!" });
    }
    
    // Remove sensitive information before sending response
    const safeUser = {
      username: updatedUser.username,
      email: updatedUser.email,
      _id: updatedUser._id,
      savedBooks: updatedUser.savedBooks
    };
    
    return res.json(safeUser);
  } catch (err) {
    console.error('Error in deleteBook:', err);
    return res.status(500).json({ 
      message: 'An error occurred while deleting the book.',
      error: (err as Error).message
    });
  }
};