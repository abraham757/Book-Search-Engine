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

// Load environment variables
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/googlebooks';
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretsshhhhh';

// === 🔹 Utility Function: Verify Token ===
const verifyToken = (token: string) => {
  try {
    if (!token) return null;
    const { data } = jwt.verify(token, JWT_SECRET) as { data: any };
    return data;
  } catch (err) {
    console.error('Token verification error:', err);
    return null;
  }
};

// === 🔹 Context Type for Apollo Server ===
interface ContextType {
  user?: { _id: string; username: string; email: string };
  token?: string;
}

// === 🔹 Initialize Express App ===
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// === 🔹 Setup Apollo Server ===
const server = new ApolloServer<ContextType>({ typeDefs, resolvers });

const startApolloServer = async () => {
  try {
    await server.start();
    console.log('✅ Apollo Server started successfully');

    // GraphQL Middleware with Auth Context
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }: { req: Request }): Promise<ContextType> => {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        console.log('🔹 Auth header received:', token ? 'Bearer [TOKEN]' : 'No auth header');

        const user = verifyToken(token);
        if (user) console.log('🔹 Authenticated user:', user._id);
        return user ? { user, token } : {};
      }
    }));

    // === 🔹 Connect to MongoDB ===
    console.log('🛠 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ MongoDB connected successfully`);

    // === 🔹 Serve Static Files ===
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    const staticPath = path.join(__dirname, '../../client/dist');
    console.log(`🛠 Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`📁 Serving static files from: ${staticPath}`);

    app.use(express.static(staticPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }));

    // React Fallback Route
    app.get('*', (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.sendFile(path.join(staticPath, 'index.html'));
    });

    // === 🔹 Start Express Server ===
    app.listen(PORT, () => {
      console.log(`🚀 API server running on port ${PORT}`);
      console.log(`📡 GraphQL available at http://localhost:${PORT}/graphql`);
      console.log(`💻 React app available at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

// Start the server
startApolloServer();
