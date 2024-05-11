// socket.d.ts
import { Socket } from "socket.io";

declare module "socket.io" {
  interface Socket {
    userId?: number; // Optional property to store the user ID
  }
}
