import express, { NextFunction, Request, Response } from 'express';
import * as Chat from '../controllers/chatController';
import * as Default from '../controllers/defaultController';

const route = express.Router();

// header: accessToken - role: Customer - field: message
// type: 
//      message**: string
route.post("/chat/new", Default.Role("Customer"), Chat.New)

// header: accessToken - role: ["Customer", "Sale"]
route.get("/chat/list", Default.Role(["Customer", "Sale"]), Chat.List)

// header: accessToken - role: ["Customer", "Sale"] - field: _id, message
// type: 
//      _id**: string
//      message**: string
route.post("/chat/addMessage", Default.Role(["Customer", "Sale"]), Chat.AddMessage)

// header: accessToken - role: ["Customer", "Sale"] - field: _id, skip, limit
// type: 
//      _id**: string
//      skip**: number 
//      limit**: number
route.post("/chat/getMessages", Default.Role(["Customer", "Sale"]), Chat.GetMessages)

export const chatRoute = route
