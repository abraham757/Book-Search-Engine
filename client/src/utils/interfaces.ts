
export interface Book {
    bookId: string;
    authors?: string[];
    description: string;
    title: string;
    image?: string;
    link?: string;
  }
  
  export interface User {
    _id: string;
    username: string;
    email: string;
    savedBooks: Book[];
  }
  
  export interface AuthData {
    token: string;
    user: User;
  }
  
  export interface LoginInput {
    email: string;
    password: string;
  }
  
  export interface AddUserInput {
    username: string;
    email: string;
    password: string;
  }
  
  export interface SaveBookInput {
    bookId: string;
    authors?: string[];
    description: string;
    title: string;
    image?: string;
    link?: string;
  }
  
  export interface MeData {
    me: User;
  }
  
  export interface LoginData {
    login: AuthData;
  }
  
  export interface AddUserData {
    addUser: AuthData;
  }
  
  export interface SaveBookData {
    saveBook: User;
  }
  
  export interface RemoveBookData {
    removeBook: User;
  }