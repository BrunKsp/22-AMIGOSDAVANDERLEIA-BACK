export interface ITokenPayload {
  sub: string;
  slug: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface IAuthResponse {
  token: string;
  type: "Bearer";
  expiresIn: string;
  user: {
    slug: string;
    name: string;
    email: string;
  };
}
