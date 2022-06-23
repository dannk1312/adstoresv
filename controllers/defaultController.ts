
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { Account, AccountInfo, IAccount } from '../models/account';
import { SendSMS } from '../services/sender';
import { codeCache } from '../services/cache';
import { config, mess, regex } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import * as sender from "../services/sender";

const RandomCode = (): string => {
    var numbers = '0123456789'
    var result = ''
    for (var i = 0; i < 6; i++) {
        result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return result;
}

export const specsModelMerge = (specsModel: any[], newSpecsInput: any[]) => {
    const valuesId_2d: any[] = []
    specsModel.forEach(spec => {
      const temp: any[] = []
      // @ts-ignore
      spec.values.forEach(value => {
        temp.push(value._id)
      });
      valuesId_2d.push(temp)
    })
  
    const result: any[] = []
    newSpecsInput.forEach((spec, i) => {
      if (!spec.name) return // delete spec
      const temp: any = { "_id": specsModel[i]._id, "name": spec.name, "values": [] }
      // console.log(temp)
      // @ts-ignore
      spec.values.split(';').forEach((value, j) => {
        if (!value) return // delete value
        temp.values.push({ "_id": valuesId_2d[i][j], "value": value })
        // console.log(temp.values[temp.values.length - 1])
      })
      result.push(temp)
    })
    return result
  }

export const SpecsSplitter = (req: Request, res: Response, next: NextFunction) => {
    const specs: {name: string, values: string}[] = req.body.specs
    const colors: string = req.body.colors
    if (!!specs && Array.isArray(specs)) {
        const temp: any = {}
        specs.forEach(s => {
            // @ts-ignore
            temp[s.name] = s.values.split(';').map(e => e.trim())
        })
        req.body.specs = temp
    }
    if(!!colors) req.body.colors = colors.split(';').map(e => e.trim())
    next()
}

export const Role = (role: string[] | string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            var token: string | undefined;
            var auth = req.headers.authorization

            // Get token from header or cookie
            if (auth && auth.split(" ")[0] === "Bearer") token = auth.split(" ")[1]
            else token = req.signedCookies['accessToken']

            if(!token) return res.status(401).send({ msg: mess.errMissField + "[Access Token]. " })

            // @ts-ignore
            const id: string = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!).id;
            const account = await AccountInfo(id)
            if (!account) return res.status(401).send({ msg: mess.errWrongField + "[Access Token]. " })
            if (role != "All" && !role.includes(account.role)) return res.status(401).send({ msg: mess.errPermission })
            
            req.body.account = account;
            return next()
        } catch (err) {
            console.log(err)
            return res.status(500).send({ msg: mess.errInternal })
        }
    }
}

export const GetAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var token: string | undefined;
        var auth = req.headers.authorization

        // Get token from header or cookie
        if (auth && auth.split(" ")[0] === "Bearer") token = auth.split(" ")[1]
        else token = req.signedCookies['accessToken']

        if(!token) return next()

        // @ts-ignore
        const id: string = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!).id;
        const account = await AccountInfo(id)
        if (!!account) req.body.account = account
        next();
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const OTPRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var email_or_phone: string = req.body.email_or_phone
        var email: string = req.body.email
        var phone: string = req.body.phone

        email_or_phone = email_or_phone ?? email ?? phone

        if (!email_or_phone) 
            return res.status(400).send({ msg: mess.errMissField + "[Email/Phone]. " })
        if (codeCache.has(email_or_phone)) 
            return res.status(400).send({ msg: mess.errRequest + ". Email/Phone này đang chờ được confirm. " })
        
        if (regex.email.test(email_or_phone)) {
            const code: string = RandomCode()
            await sender.SendMail(email_or_phone, 'Xác nhận Email', `Mời xác nhận email của bạn với mã code: ${code}`)
            console.log('otp', email_or_phone, code)
            codeCache.set(email_or_phone, code, config.waitVerifyTimeout)
            return res.send({ msg: `Mã xác nhận đã được gửi tới, Bạn có ${config.waitVerifyTimeout}s để xác nhận.` })
        } else if (regex.phone.test(email_or_phone)) {
            const code: string = RandomCode()
            await sender.SendSMS(`Confirm your phone, code: ${code}`, email_or_phone)
            console.log('otp', email_or_phone, code)
            codeCache.set(email_or_phone, code, config.waitVerifyTimeout)
            res.send({ msg: `Confirm email code was sent, You have ${config.waitVerifyTimeout}s to confirm it.` })
        } else
            return res.status(400).send({ msg: mess.errFormatField + "[Email/Phone]. " })
    } catch (err) {
        console.log(err)
        res.status(500).send({ msg: config.err500 })
    }
}

export const OTPCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var email_or_phone: string = req.body.email_or_phone
        var email: string = req.body.email
        var phone: string = req.body.phone
        var code: string = req.body.code
        
        email_or_phone = email_or_phone ?? email ?? phone
        if (codeCache.has(email_or_phone)) 
            res.status(400).send({ msg: mess.errWrongField + "[Email/Phone]. " })
        if (codeCache.get(email_or_phone) !== code && code == "000000") 
            res.status(400).send({ msg: mess.errWrongField + "[Code]. " })
        
        console.log(`${email_or_phone} pass otp check`)
        next()
    } catch (err) {
        console.log(err)
        res.status(400).send({ msg: config.err400 });
    }
}

export const PhoneFormatter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var email_or_phone: string = req.body.email_or_phone
        var phone: string = req.body.phone
        
        if(!!email_or_phone && regex.phone.test(email_or_phone)) {
            if(email_or_phone[0] == "0")
                req.body.email_or_phone = "84" + email_or_phone.slice(1)
            if(email_or_phone[0] == "+")
                req.body.email_or_phone = email_or_phone.slice(1)
        }
        if(!!phone && regex.phone.test(phone)) {
            if(phone[0] == "0")
                req.body.phone = "+84" + phone.slice(1)
            else if(phone[0] != "+")
                req.body.phone = "+" + phone
        }
        
        next()
    } catch (err) {
        console.log(err)
        res.status(400).send({ msg: config.err400 });
    }
}

