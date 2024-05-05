import express from "express";
// import https from "https";
// import fs from "fs";

// Router imports
import {
  loginRouter,
  registerRouter,
  userDataRouter,
} from "./src/routers/routes";
import http from "http";
import { Server } from "socket.io";

let mysql = require("mysql2/promise");

let conn = mysql.createPool({
  host: "danielpersonaldb.czo2s8cyqdw9.ap-northeast-1.rds.amazonaws.com",
  user: "admin",
  password: "?Danirio1115",
  database: "garhuUser",
});

const app = express();
app.use(express.json());
const port = 80;

// app.use(bodyParser.text({
//     type: "*/*"
// }));

app.use(
  express.text({
    type: "application/json",
  }),
);

app.use("/auth", loginRouter);
app.use("/auth", registerRouter);
app.use("/", userDataRouter);

app.get("/", (req: express.Request, res: express.Response) => {
  return res.send({
    status: 200,
    message: "OK",
  });
});

// Code block to create HTTPS Server
// const httpsServer = https.createServer({
//     key: fs.readFileSync("./server.key"),
//     cert: fs.readFileSync("./server.cert")
// }, app);

// httpsServer.listen(port, () => {
//     console.log(`Listening at: https://127.0.0.1:${port}/`);
// });

// conn.connect();
// conn.connect((err: any) => {
//     if (err) {
//         console.error('Error connecting to the database:', err);
//     } else {
//         console.log('Connected to the database');
//     }
// });

app.get("/stories", async (req, res) => {
  try {
    const [results] = await conn.query("SELECT * FROM Stories");
    res.send(results);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({ error: "Database Error" });
  }
});

app.get("/storyImages/:storyId", async (req, res) => {
  const storyId = req.params.storyId;
  try {
    const [results] = await conn.query(
      "SELECT * FROM StoryImages WHERE storyId = ?",
      [storyId],
    );
    res.send(results);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({ error: "Database Error" });
  }
});

app.get("/recommendsCommunity", async (req, res) => {
  try {
    const [results] = await conn.query("SELECT * FROM RecommendsCommunity");
    res.send(results);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({ error: "Database Error" });
  }
});

app.get("/recommendsPlace", async (req, res) => {
  try {
    const [results] = await conn.query("SELECT * FROM RecommendsPlace");
    res.send(results);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({ error: "Database Error" });
  }
});

app.post("/api/friends/add", async (req, res) => {
  const { userId, friendId } = req.body;
  if (userId === friendId) {
    return res
      .status(400)
      .json({ message: "Cannot add yourself as a friend." });
  }
  try {
    const [exists] = await conn.query(
      "SELECT * FROM Friends WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)",
      [userId, friendId, friendId, userId],
    );
    if (exists.length > 0) {
      return res.status(409).json({ message: "You two are already friends" });
    }
    await conn.query("INSERT INTO Friends (user_id1, user_id2) VALUES (?, ?)", [
      Math.min(userId, friendId),
      Math.max(userId, friendId),
    ]);
    res.status(201).json({ message: "Friend request sent successfully." });
  } catch (error: any) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/api/friends/:userId/chats", async (req, res) => {
  console.log("Fetching chats for user:", req.params.userId);
  try {
    const userId = req.params.userId;
    const query = `
            SELECT u.user_id as id, u.username, m.message as lastMessage
            FROM Friends f
            JOIN Users u ON u.user_id = CASE WHEN f.user_id1 = ? THEN f.user_id2 ELSE f.user_id1 END
            LEFT JOIN Messages m ON m.message_id = (
                SELECT MAX(message_id)
                FROM Messages
                WHERE (sender_id = ? AND receiver_id = u.user_id) OR
                      (sender_id = u.user_id AND receiver_id = ?)
                ORDER BY timestamp DESC
                LIMIT 1
            )
            WHERE ? IN (f.user_id1, f.user_id2)
        `;
    const [results] = await conn.query(query, [userId, userId, userId, userId]);
    res.json(results);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({ error: "Database Error" });
  }
});

app.get("/api/chats/:senderId/:receiverId", async (req, res) => {
  const { senderId, receiverId } = req.params;
  try {
    const query = `
            SELECT message, sender_id AS senderId
            FROM Messages
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ORDER BY timestamp ASC
        `;
    const [messages] = await conn.query(query, [
      senderId,
      receiverId,
      receiverId,
      senderId,
    ]);
    const results = messages.map((msg: any) => ({
      message: msg.message,
      senderId: msg.senderId,
      isFromCurrentUser: msg.senderId === parseInt(senderId),
    }));
    res.json(results);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({ error: "Database Error" });
  }
});

app.get("/branches", async (req, res) => {
  try {
    const [results] = await conn.query("SELECT * FROM Branches");
    res.send(results);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({ error: "Database Error" });
  }
});

//! Create an HTTP server that wraps your Express app
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(server);
let userSockets: any = {};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("register", async (userId) => {
    userSockets[userId] = socket.id;
    console.log(`User ${userId} registered with socket ID ${socket.id}`);

    // Fetch undelivered messages from the database
    try {
      const query = `
                SELECT message, sender_id AS senderId
                FROM Messages
                WHERE receiver_id = ? AND delivered = 0
            `;
      const [undeliveredMessages] = await conn.query(query, [userId]);
      undeliveredMessages.forEach((msg: any) => {
        socket.emit("chat message", {
          message: msg.message,
          senderId: msg.senderId,
          receiverId: userId,
        });
        // Update message status to delivered
        const updateQuery = `
                    UPDATE Messages
                    SET delivered = 1
                    WHERE message_id = ?
                `;
        conn.query(updateQuery, [msg.message_id]);
      });
    } catch (error) {
      console.error("Error fetching undelivered messages:", error);
    }
  });

  socket.on("chat message", async (data, callback) => {
    const { message, senderId, receiverId } = data;
    const receiverSocketId = userSockets[receiverId];

    const query =
      "INSERT INTO Messages (sender_id, receiver_id, message, delivered) VALUES (?, ?, ?, ?)";
    try {
      await conn.query(query, [
        senderId,
        receiverId,
        message,
        receiverSocketId ? 1 : 0,
      ]);
      console.log("Message stored in database");

      if (receiverSocketId) {
        console.log("Emitting message to receiver");
        // Emit only to the receiver, not back to the sender
        io.to(receiverSocketId).emit("chat message", {
          message,
          senderId,
          receiverId,
        });
      }

      if (typeof callback === "function") {
        callback({ success: true });
      }
    } catch (error) {
      console.error("Database Error:", error);
      if (typeof callback === "function") {
        callback({ success: false });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
    // Remove the socket from the map when the user disconnects
    Object.keys(userSockets).forEach((userId) => {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
      }
    });
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
