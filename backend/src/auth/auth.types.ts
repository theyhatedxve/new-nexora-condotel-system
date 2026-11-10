export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user?: PublicUser;
  refreshToken: string;
}
