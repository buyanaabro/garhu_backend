
import express from "express";
// import https from "https";
// import fs from "fs";

// Router imports
import { loginRouter, registerRouter, userDataRouter } from "./src/routers/routes";
import http from "http"
import { Server } from "socket.io";

let mysql = require('mysql2')

let conn = mysql.createPool({
    host : 'danielpersonaldb.czo2s8cyqdw9.ap-northeast-1.rds.amazonaws.com',
    user: 'admin',
    password: '?Danirio1115',
    database: 'garhuUser'
})

const app = express();
const port = 80;

// app.use(bodyParser.text({
//     type: "*/*"
// }));

app.use(express.text({
    type: "application/json"
}));

app.get("/", (req: express.Request, res: express.Response) => {
    return res.send({
        status: 200,
        message: "OK"
    });
});

app.use(express.json())
app.use("/auth", loginRouter);
app.use("/auth", registerRouter);
app.use("/", userDataRouter);

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

app.get('/stories', (req, res) => {
    conn.query("SELECT * FROM Stories", (error: any, results: string | any[] | undefined) => {
        if (error) throw error;
        return res.send(results)
    })
})

app.get('/storyImages/:storyId', (req, res) => {
    const storyId = req.params.storyId;
    const query = "SELECT * FROM StoryImages WHERE storyId = ?";

    conn.query(query, [storyId], (error: any, results: any) => {
        if (error) {
            console.error("Database Error:", error);
            return res.status(500).send({ error: "Database Error" });
        }
        return res.send(results);
    });
});

app.get('/recommendsCommunity', (req, res) => {
    conn.query("SELECT * FROM RecommendsCommunity", (error: any, results: string | any[] | undefined) => {
        if (error) throw error;
        return res.send(results)
    })
})

app.get('/recommendsPlace', (req, res) => {
    conn.query("SELECT * FROM RecommendsPlace", (error: any, results: string | any[] | undefined) => {
        if (error) throw error;
        return res.send(results)
    })
})

// POST /api/friends/add
app.post('/api/friends/add', async (req, res) => {
    const { userId, friendId } = req.body;
    console.log("User ID:", userId, "Friend ID:", friendId);
    if (userId === friendId) {
        return res.status(400).json({ message: "Cannot add yourself as a friend." });
    }

    try {
        const existsQuery = `SELECT * FROM Friends WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)`;
        const [exists] = await conn.query(existsQuery, [userId, friendId, friendId, userId]);

        if (exists.length > 0) {
            return res.status(409).json({ message: "u 2 r already friends" });
        }

        const insertQuery = `INSERT INTO Friends (user_id1, user_id2) VALUES (?, ?)`;
        await conn.query(insertQuery, [Math.min(userId, friendId), Math.max(userId, friendId)]);
        res.status(201).json({ message: "Friend request sent successfully." });
    } catch (error: any) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


// Create an HTTP server that wraps your Express app
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(server);

// Listen for WebSocket connections
io.on("connection", (socket) => {
    console.log("A user connected");

    // Handle chat messages
socket.on("chat message", (data, callback) => {
    const { message, senderId, receiverId } = data;
    console.log("Message:", message);

    const query = "INSERT INTO Messages (sender_id, receiver_id, message) VALUES (?, ?, ?)";
    conn.query(query, [senderId, receiverId, message], (error: any, results: any) => {
        if (error) {
            console.error("Database Error:", error);
            if (typeof callback === 'function') {
                callback({ success: false });
            }
            return;
        }
        // Broadcast the message to all connected clients
        io.emit("chat message", message);
        if (typeof callback === 'function') {
            callback({ success: true });
        }
    });
});

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});



server.listen(port, '0.0.0.0', () => {
 console.log(`Server running on port ${port}`);
});

// const server = 
// app.listen(port, () => {
//  console.log(`Server running on port ${port}`);
// });

// server.timeout = 10 * 60 * 1000;