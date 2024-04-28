import jwt from "jsonwebtoken"

import { jwt_secret } from "../configs/secrets.json";

function createAuthToken(user_id: number, username: string, email: string): string {
    let jwtPayload = {
        user_id,
        username,
        email
    }
    
    return jwt.sign(jwtPayload, jwt_secret, { expiresIn: "3h" });
}

export default createAuthToken
