import express, { Request } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs, resolvers } from './schemas/index.js';
import jwt from 'jsonwebtoken';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretsshhhhh';

// Function to verify JWT token
const verifyToken = (token: string) => {
  try {
    if (!token) return null;
    
    // Verify token and extract user data
    const { data } = jwt.verify(token, JWT_SECRET) as { data: any };
    return data;
  } catch (err) {
    console.error('Token verification error:', err);
    return null;
  }
};

// Define context type with user information
interface ContextType {
  user?: {
    _id: string;
    username: string;
    email: string;
  };
  token?: string;
}

// Create a new instance of an Apollo server with the GraphQL schema
const startApolloServer = async (): Promise<void> => {
  try {
    // Initialize Apollo Server
    const server = new ApolloServer<ContextType>({
      typeDefs,
      resolvers,
    });

    await server.start();
    console.log('Apollo Server started successfully');

    const PORT = process.env.PORT || 3001;
    const app = express();

    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());

    // Add GraphQL middleware with proper authentication context
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }: { req: Request }): Promise<ContextType> => {
        // Get the auth header
        const authHeader = req.headers.authorization || '';
        
        // Log the auth header for debugging (mask token for security)
        const headerForLogging = authHeader ? 
          (authHeader.startsWith('Bearer ') ? 'Bearer [TOKEN]' : '[TOKEN]') : 
          'No auth header';
        console.log('Auth header received:', headerForLogging);
        
        // Extract token - remove 'Bearer ' if present
        const token = authHeader.startsWith('Bearer ') ? 
          authHeader.slice(7) : authHeader;
        
        if (token) {
          try {
            // Verify token and extract user data
            const user = verifyToken(token);
            if (user) {
              console.log('Authenticated user in context:', user._id);
              return { user, token };
            }
          } catch (error) {
            console.error('Authentication error:', error);
          }
        }
        
        return {}; // Return empty context if no valid token
      },
    }));

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    try {
      // Define MongoDB URI with fallback for local development
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/googlebooks';
      
      console.log(`Using MongoDB URI: ${MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):[^@]+@/, 'mongodb$1://$2:****@')}`);
      
      // Connect to MongoDB
      await mongoose.connect(MONGODB_URI);
      console.log('MongoDB connected successfully');
      
      // Determine static path based on environment
      const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
      const staticPath = path.join(__dirname, '../../client/dist');
      
      console.log('Environment:', isProduction ? 'Production' : 'Development');
      console.log('Static files path:', staticPath);
      
      // Serve static assets
      app.use(express.static(staticPath, {
        // Cache control for better performance
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            // Don't cache HTML files
            res.setHeader('Cache-Control', 'no-cache');
          } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) {
            // Cache JS/CSS/image files
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
        }
      }));
      
      // Handle React routing with explicit content type
      app.get('*', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(path.join(staticPath, 'index.html'));
      });
      
      // Start Express server
      app.listen(PORT, () => {
        console.log(` API server running on port ${PORT}!`);
        console.log(` Use GraphQL at http://localhost:${PORT}/graphql`);
        console.log(` React app available at http://localhost:${PORT}`);
      });
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Call the async function to start the server
startApolloServer();