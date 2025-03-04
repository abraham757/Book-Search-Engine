import User from '../models/User';

export const resolvers = {
  Query: {
    // Fetch all users
    users: async () => await User.find(),
    
    // Fetch a single user by ID
    user: async (_: any, { id }: { id: string }) => await User.findById(id),
  },
  
  Mutation: {
    // Create a new user
    addUser: async (_: any, { username, email }: { username: string; email: string }) => {
      const user = new User({ username, email });
      await user.save();
      return user;
    },
  },
};
export default resolvers;