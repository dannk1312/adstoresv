import express, { NextFunction, Request, Response } from 'express';
import * as Default from '../controllers/defaultController';
import * as Admin from '../controllers/adminController';
import { Category } from '../models/category';


const route = express.Router();

// header: accessToken - role: "Admin" - field: dateStart, dateEnd
// type:
//     dateStart**: string
//     dateEnd: string - undefine = now
//     step: string - "second", "day", "month", "year"
//     type: string - "bill", "import" - undefine = "bill"
route.post("/statistical", Default.Role("Admin"), Admin.Statistical)

// header: accessToken - role: "Admin" - field: dateStart, dateEnd
// type:
//      dateStart**: Date
//      dateEnd: Date - undefine = now
//route.post("/model/build", Default.Role("Admin"), Admin.BuildModel)

// header: accessToken - role: "Admin" - field: dateStart, dateEnd
// type:
//      dateStart**: Date
//      dateEnd: Date - undefine = now
//route.post("/model/delete", Default.Role("Admin"), Admin.DeleteModel)

route.post("/check_ship", Default.Role("Admin"), Admin.CheckShip)


export const adminRoute = route
