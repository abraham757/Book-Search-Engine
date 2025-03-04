const typeDefs = `
type Book {
  bookId: ID!
  authors: [String]
  description: String!
  title: String!
  image: String
  link: String
}
  
type User {
  _id: ID!
  username: String!
  email: String!
  bookCount: Int
  savedBooks: [Book]
}

type Auth {
  token: ID!
  user: User
}

input BookInput {
  bookId: String!
  authors: [String]
  description: String!
  title: String!
  image: String
  link: String
}
  
type Query {
  me: User
  books: [Book]  # Add this line to match your resolver
  user(username: String): User  # Add this line to match your resolver
}
    
type Mutation {
  login(email: String!, password: String!): Auth
  addUser(username: String!, email: String!, password: String!): Auth
  saveBook(bookData: BookInput!): User
  removeBook(bookId: ID!): User
}`

export default typeDefs;