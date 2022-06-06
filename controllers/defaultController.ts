
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { Account, IAccount } from '../models/account';
import { SendSMS } from '../services/sender';
import { codeCache } from '../services/cache';
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import * as sender from "../services/sender";

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
            var token: string;
            if (req.headers.authorization &&
                req.headers.authorization.split(" ")[0] === "Bearer") {
                // Get from Header
                token = req.headers.authorization.split(" ")[1]
            } else {
                // Try to get from signedtoken
                token = req.signedCookies['accessToken']
            }
            // @ts-ignore
            const id: string = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!).id;
            // @ts-ignore
            const acc: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId } = await Account.findById(id)
            if (roles.includes(acc.role)) {
                req.body.account = acc;
                next();
            } else throw new Error(`${acc.email + " " + acc.role}`)
        } catch (err) {
            console.log("Token lost / user role not fixed")
            return res.status(400).send({ msg: config.errPermission })
        }
    }
}

export const phoneOTPRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone } = req.body
        const code: string = randomCode();
        if (!config.phoneRegEx.test(phone))
            return res.status(400).send({ msg: `Phone format not correct` })
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
        if (!config.emailRegEx.test(email))
            return res.status(400).send({ msg: `Email format not correct` })
        if (await sender.SendMail(email, 'Email Verify', `Confirm your email, code: ${code}`)) {
            console.log('otp', email, code)
            codeCache.set(email, code, config.waitVerifyTimeout)
            res.send({ msg: `Confirm email code was sent, You have ${config.waitVerifyTimeout}s to confirm it.` })
        } else {
            res.status(500).send({ msg: "We've got some problems with confirm email, please try again later." })
        }
    } catch (err: any) {
        res.status(400).send('This perform need more field or have some problem. ');
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

export const OTPRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email_or_phone } = req.body
        if (config.emailRegEx.test(email_or_phone)) {
            const code: string = randomCode()
            if (await sender.SendMail(email_or_phone, 'Email Verify', `Confirm your email, code: ${code}`)) {
                console.log('otp', email_or_phone, code)
                codeCache.set(email_or_phone, code, config.waitVerifyTimeout)
                res.send({ msg: `Confirm email code was sent, You have ${config.waitVerifyTimeout}s to confirm it.` })
            } else {
                res.status(500).send({ msg: config.err500 })
            }
        } else if (config.phoneRegEx.test(email_or_phone)) {
            const code: string = randomCode()
            if (await sender.SendSMS(`Confirm your phone, code: ${code}`, email_or_phone)) {
                console.log('otp', email_or_phone, code)
                codeCache.set(email_or_phone, code, config.waitVerifyTimeout)
                res.send({ msg: `Confirm email code was sent, You have ${config.waitVerifyTimeout}s to confirm it.` })
            } else {
                res.status(500).send({ msg: config.err500 })
            }
        } else
            return res.status(400).send({ msg: config.err400 })
    } catch (err) {
        console.log(err)
        res.status(500).send({ msg: config.err500 })
    }
}

export const OTPCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email_or_phone, code } = req.body
        if (codeCache.get(email_or_phone) === code) {
            console.log(`${email_or_phone} pass otp check`)
            next()
        } else {
            res.status(400).send({ msg: "Timeout" })
        }
    } catch (err) {
        res.status(400).send({ msg: config.err400 });
    }
}


