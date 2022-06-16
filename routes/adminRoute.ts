import express, { NextFunction, Request, Response } from 'express';
import * as Default from '../controllers/defaultController';
import * as Admin from '../controllers/adminController';


const route = express.Router();

// header: accessToken - role: "Admin" - field: dateStart, dateEnd
// type:
//     dateStart**: Date
//     dateEnd: Date - undefine = now
//     step: string - "second", "day", "month", "year"
route.post("/statistical/bills", Default.Role("Admin"), Admin.BillStatistical)

// header: accessToken - role: "Admin" - field: dateStart, dateEnd
// type:
//      dateStart**: Date
//      dateEnd: Date - undefine = now
//      step: string - "second", "day", "month", "year" - undefine = month
route.post("/statistical/imports", Default.Role("Admin"), Admin.ImportStatistical)

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
