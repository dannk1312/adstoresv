import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { dbconnect } from './services/database';
import { route } from './routes/router';
import cors from "cors";
import cookieParser from 'cookie-parser';
import * as sender from './services/sender';
import * as image from './services/image';


dotenv.config();
sender.Setup();
image.Setup();
dbconnect();

const port = process.env.PORT || 5000

const app: Express = express()
app.use(cors())
app.use(cookieParser(process.env.ACCESS_TOKEN_SECRET))

app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))
app.use(route)

app.listen(port, () => {
  console.log(`[log] Server is running at http://localhost:${port}`)
});
