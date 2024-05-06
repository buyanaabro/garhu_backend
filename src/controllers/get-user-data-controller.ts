import { Request, Response } from "express";
import decodeAuthToken from "../middlewares/decode-auth-token";
import { UserClientData } from "../utils/types";

async function getUserDataController(req: Request, res: Response) {
  const { token: authToken } = req.body;

  if (!authToken) {
    return res.status(400).send({
      status_code: 400,
      message: "Authentication token was not provided",
    });
  }

  const decoded: UserClientData | undefined = decodeAuthToken(authToken);
  if (!decoded) {
    return res.status(400).send({
      status_code: 400,
      message: "Invalid auth token",
    });
  }

  return res.status(200).send({
    status_code: 200,
    user_id: decoded.user_id,
    username: decoded.username,
    email: decoded.email,
  });
}

export default getUserDataController;
