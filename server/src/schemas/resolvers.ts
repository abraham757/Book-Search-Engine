import User from "../models/User.js";
import { UserDocument } from "../models/User.js";
import { BookDocument } from "../models/User.js";
import jwt from 'jsonwebtoken';

// Helper function for generating JWT tokens with proper typing
const signToken = (user: { username: string; email: string; _id: string | any }): string => {
  const payload = { 
    username: user.username, 
    email: user.email, 
    _id: user._id.toString ? user._id.toString() : user._id 
  };
  return jwt.sign({ data: payload }, process.env.JWT_SECRET_KEY || 'mysecretsshhhhh', { expiresIn: '2h' });
};

const resolvers = {
  Query: {
    // Get the current logged-in user
    me: async (_parent: any, _args: any, context: any): Promise<UserDocument | null> => {
      if (context.user) {
        try {
          return await User.findOne({ _id: context.user._id }).select('-__v -password');
        } catch (error) {
          console.error('Error fetching user data:', error);
          throw new Error('Failed to fetch user data');
        }
      }
      throw new Error('Not logged in');
    },
    
    // Resolver to fetch all books from all users (without duplicates)
    books: async (): Promise<BookDocument[]> => {
      try {
        // Find all users that have saved books
        const users = await User.find({ 'savedBooks.0': { $exists: true } });
        
        // Extract all books from all users
        const allBooks = users.flatMap(user => user.savedBooks);
        
        // Remove duplicates by bookId
        const uniqueBookIds = new Set<string>();
        const uniqueBooks = allBooks.filter(book => {
          const isDuplicate = uniqueBookIds.has(book.bookId);
          uniqueBookIds.add(book.bookId);
          return !isDuplicate;
        });
        
        return uniqueBooks;
      } catch (error) {
        console.error('Error fetching books:', error);
        throw new Error(`Failed to fetch books: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    
    // Resolver to fetch a user by username
    user: async (_parent: any, args: { username?: string }): Promise<UserDocument | null> => {
      try {
        const params = args.username ? { username: args.username } : {};
        return User.findOne(params);
      } catch (error) {
        console.error('Error fetching user:', error);
        throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  },
  
  Mutation: {
    // Add a new user
    addUser: async (_parent: any, args: { username: string; email: string; password: string }): Promise<{ token: string; user: UserDocument }> => {
      try {
        const user = await User.create(args);
        const token = signToken(user);
        return { token, user };
      } catch (error) {
        console.error('Error creating user:', error);
        throw new Error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    
    // Login a user
    login: async (_parent: any, { email, password }: { email: string; password: string }): Promise<{ token: string; user: UserDocument }> => {
      try {
        const user = await User.findOne({ email });
        
        if (!user) {
          throw new Error('No user found with this email address');
        }
        
        const correctPassword = await user.isCorrectPassword(password);
        
        if (!correctPassword) {
          throw new Error('Incorrect credentials');
        }
        
        const token = signToken(user);
        return { token, user };
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    
    // Save book to user's savedBooks
    saveBook: async (_parent: any, { bookData }: { bookData: BookDocument }, context: any): Promise<UserDocument> => {
      if (context.user) {
        try {
          const updatedUser = await User.findByIdAndUpdate(
            context.user._id,
            { $addToSet: { savedBooks: bookData } },
            { new: true, runValidators: true }
          );
          
          if (!updatedUser) {
            throw new Error('Could not find user');
          }
          
          return updatedUser;
        } catch (error) {
          console.error('Error saving book:', error);
          throw new Error('Error saving book to your account');
        }
      }
      throw new Error('You need to be logged in!');
    },
    
    // Remove book from user's savedBooks
    removeBook: async (_parent: any, { bookId }: { bookId: string }, context: any): Promise<UserDocument> => {
      if (context.user) {
        try {
          const updatedUser = await User.findByIdAndUpdate(
            context.user._id,
            { $pull: { savedBooks: { bookId } } },
            { new: true }
          );
          
          if (!updatedUser) {
            throw new Error('Could not find user');
          }
          
          return updatedUser;
        } catch (error) {
          console.error('Error removing book:', error);
          throw new Error('Error removing book from your account');
        }
      }
      throw new Error('You need to be logged in!');
    },
  },
};

export default resolvers;