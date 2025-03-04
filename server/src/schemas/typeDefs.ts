import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  # User type definition
  type User {
    id: ID!
    username: String!
    email: String!
    friends: [User]
  }

  # Queries
  type Query {
    users: [User]        # Fetch all users
    user(id: ID!): User  # Fetch a single user by ID
  }

  # Mutations
  type Mutation {
    addUser(username: String!, email: String!): User # Create a new user
  }
`;

export default typeDefs;