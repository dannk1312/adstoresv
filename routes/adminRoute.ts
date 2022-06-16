import express, { NextFunction, Request, Response } from 'express';
import * as Default from '../controllers/defaultController';
import * as Bill from '../controllers/billController';


const route = express.Router();

// header: accessToken - role: "Admin" - field: dateStart, dateEnd
// type:
//       dateStart**: Date
//       dateEnd: Date - undefine = now
//route.post("/statistical/bills", Default.Role("Admin"), Bill.Statistical)


export const adminRoute = route
