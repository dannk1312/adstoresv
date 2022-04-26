
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { Account, IAccount } from '../models/account';
import { SendSMS } from '../services/sms';
import { codeCache } from '../services/cache';
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import { SendMail } from "../services/email";

const randomCode = (): string => {
    var numbers = '0123456789'
    var result = ''
    for (var i = 0; i < 6; i++) {
        result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return result;
}

export const roleVerify = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token: string = req.signedCookies['accessToken'];
            // @ts-ignore
            const id: string = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!).id;
            // @ts-ignore
            const acc: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId } = await Account.findById(id)

            if (roles.includes(acc.role)) {
                req.body.account = acc;
                next();
            } else throw new Error()
        } catch (err) {
            console.log(err)
            return res.status(400).send({ msg: `Need permission in ${roles.toString()} to perform this action` })
        }
    }
}

export const phoneOTPRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone } = req.body
        const code: string = randomCode();
        if (await SendSMS(`Confirm your phone number, code: ${code}`, phone)) {
            console.log('otp', phone, code)
            codeCache.set(phone, code, config.waitVerifyTimeout)
            res.send({ msg: `Confirm phone code was sent, You have ${config.waitVerifyTimeout}s to confirm it.` })
        } else {
            res.status(500).send({ msg: "We've got some problems with confirm email, please try again later." })
        }
    } catch (err) {
        console.log(err)
        res.status(400).send('This perform need more field or have some problem.');
    }
}

export const phoneOTPCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone, code } = req.body
        if (codeCache.get(phone) === code) {
            next()
        } else {
            res.status(400).send({ msg: "Timeout" })
        }
    } catch (err) {
        console.log(err)
        res.status(400).send('This perform need more field or have some problem.');
    }
}

export const emailOTPRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body
        const code: string = randomCode();
        if (await SendMail(email, 'Email Verify', `Confirm your email, code: ${code}`)) {
            console.log('otp', email, code)
            codeCache.set(email, code, config.waitVerifyTimeout)
            res.send({ msg: `Confirm email code was sent, You have ${config.waitVerifyTimeout}s to confirm it.` })
        } else {
            res.status(500).send({ msg: "We've got some problems with confirm email, please try again later." })
        }
    } catch (err) {
        console.log(err)
        res.status(400).send('This perform need more field or have some problem.');
    }
}

export const emailOTPCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, code } = req.body
        if (codeCache.get(email) === code) {
            next()
        } else {
            res.status(400).send({ msg: "Timeout" })
        }
    } catch (err) {
        console.log(err)
        res.status(400).send('This perform need more field or have some problem.');
    }
}

export const emailCheck = async (req: Request, res: Response, next: NextFunction) => {
    const email: string = req.body.email
    if(email) {
        if(!config.emailRegEx.test(email))
            return res.status(400).send({msg: 'Email format is not correct'})
        if(await Account.exists({email}))
            return res.status(400).send({msg: 'Email has already been used'})
        next()
    } else {
        res.status(400).send({msg: 'Not enough information for this perform'})
    }
}

export const phoneCheck = async (req: Request, res: Response, next: NextFunction) => {
    const phone: string = req.body.phone
    if(phone) {
        if(!config.phoneRegEx.test(phone))
            return res.status(400).send({msg: 'Phone format is not correct'})
        if(await Account.exists({phone}))
            return res.status(400).send({msg: 'Phone has already been used'})
        next()
    } else {
        res.status(400).send({msg: 'Not enough information for this perform'})
    }
}
