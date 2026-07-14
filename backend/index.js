import "dotenv/config";

import express from "express";
import db from "./db/db.config.js";
import cors from 'cors'
import mainRouter from "./src/api/main.routes.js";
import { errorHandler } from "./src/middleware/error-handler.js";

const app = express();
// Allow requests from your frontend port
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["https://chatgpt-gpts.vercel.app/"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);



app.use(express.json());
app.use("/api", mainRouter);


  async function startServer() {
    try {
      

      console.log(
        `Attempting to connect to database at ${process.env.DB_HOST}...`,
      );

      const connection = await db.getConnection();
      console.log("Database connected successfully");
      connection.release();
      const PORT = process.env.PORT || 3777;

      app.listen(PORT, (err) => {
        if (err) {
          throw err;
        }
        console.log(`Server is running on port http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error("Error starting server:", error.message);
      console.error("Full error details:", error);
      process.exit(1);
    }
  }


startServer();
