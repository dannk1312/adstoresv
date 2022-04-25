import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { dbconnect } from './database/database';
import { route } from './routes/router';
import cors from "cors";
import cookieParser from 'cookie-parser';
import { SendMail } from './services/email';
import { SendSMS } from './services/sms';

dotenv.config();
dbconnect();
const port = process.env.PORT || 5000

const app: Express = express()
app.use(cors())
app.use(cookieParser(process.env.ACCESS_TOKEN_SECRET))
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(route)

app.listen(port, () => {
  console.log(`[log] Server is running at http://localhost:${port}`);
});
