import express, { NextFunction, Request, Response } from 'express';
import { AccountEmailCreate, AccountEmailVerify, AccountPhoneCreate, AccountPhoneVerify, AccountSignin, AccountUpdateInfo } from '../controllers/accountController';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { Account, IAccount } from '../models/account';

export const route = express.Router();
route.get("/", (req: Request, res: Response) => {
    res.send(`ADStore Server`);
})

const verify = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token: string = req.signedCookies['accessToken'];
            // @ts-ignore
            const id: string = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!).id;
            // @ts-ignore
            const acc: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId } = await Account.findById(id)
            
            if(roles.includes(acc.role)) {
                req.body.account = acc;
                next();
            } else throw new Error()
        } catch (err) {
            return res.status(400).send({ msg: `Need permission in ${roles.toString()} to perform this action` })
        }
    }
}

route.post("/customer/emailCreate", AccountEmailCreate)
route.post("/customer/phoneCreate", AccountPhoneCreate)
route.get("/customer/emailVerify/:token", AccountEmailVerify)
route.post("/customer/phoneVerify", AccountPhoneVerify)
route.post("/customer/login", AccountSignin)

route.post("/customer/update", verify(["Customer", "Sale", "Admin"]), AccountUpdateInfo)
