import express, { NextFunction, Request, Response } from 'express';
import * as Social from '../controllers/socialController';
import * as Default from '../controllers/defaultController';

const route = express.Router();


// field: email
// type: 
//       email: string
route.post("/follow/add", Social.Follow)

// header: accessToken - role: Sale, Admin - field: emails
// type: 
//       emails: string[]
route.post("/follow/delete", Default.Role(["Sale", "Admin"]), Social.DeleteFollows)

// header: accessToken - role: Sale, Admin - field: skip, limit
// type: 
//       skip: number - undefine = 0
//       limit: number - undefine = 10000
route.post("/follow/list", Default.Role(["Sale", "Admin"]), Social.ListFollows)

// field: email, message
// type: 
//       email**: string
//       message**: string
route.post("/comment/add", Social.Comment)

// header: accessToken - role: Sale, Admin - field: skip, limit
// type: 
//       skip: number - undefine = 0
//       limit: number - undefine = 10000
route.post("/comment/list", Default.Role(["Sale", "Admin"]), Social.ListComments)

// header: accessToken - role: Sale, Admin - field: _ids
// type: 
//       _ids: string[]
route.post("/comment/delete", Default.Role(["Sale", "Admin"]), Social.DeleteComments)

export const socialRoute = route
