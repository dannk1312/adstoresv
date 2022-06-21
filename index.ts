import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { dbconnect } from './services/database';
import cors from "cors";
import cookieParser from 'cookie-parser';
import * as sender from './services/sender';
import * as image from './services/image';
import { accountRoute } from './routes/accountRoute';
import { billRoute } from './routes/billRoute';
import { categoryRoute } from './routes/categoryRoute';
import { chatRoute } from './routes/chatRoute';
import { discountRoute } from './routes/discountRoute';
import { productRoute } from './routes/productRoute';
import { adminRoute } from './routes/adminRoute';
import { socialRoute } from './routes/socialRoute';


dotenv.config();
sender.Setup();
image.Setup();
dbconnect();

const port = process.env.PORT || 5000

const app: Express = express()
app.use(cors())
// @ts-ignore
app.options('*', cors()) 
app.use(cookieParser(process.env.ACCESS_TOKEN_SECRET))

app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))
app.use(accountRoute)
app.use(billRoute)
app.use(categoryRoute)
app.use(chatRoute)
app.use(discountRoute)
app.use(productRoute)
app.use(adminRoute)
app.use(socialRoute)

app.use("/", (req: Request, res: Response) => {
  res.send(req.protocol + "://" + req.hostname);
})

app.listen(port, () => {
  console.log(`[log] Server is running at http://localhost:${port}`)
});
