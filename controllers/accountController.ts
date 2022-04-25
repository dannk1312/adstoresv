import { Account, IAccount, passwordCheck } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { SendMail } from "../services/email";
import { SendSMS } from "../services/sms";
import { phoneCodeCache } from "../services/cache";


const waitVerifyTimeout = 60;


// SIGN UP
export const AccountEmailCreate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var { email, password, name, birth, gender } = req.body;

        if (password) {
            if (passwordCheck(password))
                password = await argon2.hash(password)
            else
                return res.status(400).send("Account password format is not correct. Rule: Minimum eight characters, at least one letter and one number")
        }
        if (await Account.exists({ email }))
            return res.status(400).send({msg: "Account email already in use"})
        const account = new Account({ email, password, name, birth, gender });
        account.save(async (err, doc) => {
            if (err) return res.send({ msg: err.message })
            const token: string = jwt.sign({ id: doc._id }, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: waitVerifyTimeout + 's' });
            const link: string = `${req.protocol}://${req.get("host")}/customer/emailVerify/${token}`

            if (await SendMail(email, 'Confirm your email', `Link Verify: ${link}`)) {
                res.send({ msg: `Confirm email was sent, You have ${waitVerifyTimeout}s to confirm your email address.` })

                // remove account if timeout 
                setTimeout(() => {
                    Account.findById(doc._id, (_err: Error, _doc: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId }) => {
                        if (_doc && _doc.role == 'Guest') {
                            console.log(`Timeout, remove account Guest ${email}`);
                            _doc.remove()
                        }
                    })
                }, waitVerifyTimeout * 1000)
            } else {
                doc.remove();
                res.status(500).send({ msg: "We've got some problems with confirm email, please try again later." })
            }
        });
    } catch (err) {
        res.status(400).send({ msg: "Not enough information to Create" })
    }
};

export const AccountPhoneCreate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var { phone } = req.body;

        if (await Account.exists({ phone }))
            return res.status(400).send("Account email already in use")

        const account = new Account({ phone });
        account.save(async (err, doc) => {
            if (err) return res.send({ msg: err.message })

            const code: string = Math.floor(Math.random() * 8999 + 1000).toString();
            if (await SendSMS(`Confirm your phone number, code: ${code}`, phone)) {
                phoneCodeCache.set(phone, code, waitVerifyTimeout)
                res.send({ msg: `Confirm phone code was sent, You have ${waitVerifyTimeout}s to confirm it.` })

                // remove account if timeout 
                setTimeout(() => {
                    Account.findById(doc._id, (_err: Error, _doc: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId }) => {
                        if (_doc && _doc.role == 'Guest') {
                            console.log(`Timeout, remove account Guest ${phone}`);
                            _doc.remove()
                        }
                    })
                }, waitVerifyTimeout * 1000)
            } else {
                doc.remove();
                res.status(500).send({ msg: "We've got some problems with confirm email, please try again later." })
            }
        });
    } catch (err) {
        res.status(400).send({ msg: "Not enough information to Create" })
    }
}

export const AccountPhoneVerify = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone, code } = req.body;
        if (phoneCodeCache.get(phone) !== code)
            throw new Error()

        // @ts-ignore
        const acc: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId } = await Account.findOne({ phone })
        acc.updateOne({ role: 'Customer' }, (_err: Error) => {
            if (_err)
                return res.status(500).send({ msg: "We've got some problems with verify account, please try again later." })
            return res.send({ msg: 'Verify Success' })
        })
    }
    catch (err) {
        return res.status(404).send({ msg: 'Verify Failure' })
    }
}

export const AccountEmailVerify = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token: string = req.params.token!?.toString();
        // @ts-ignore
        const id: string = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!).id;
        // @ts-ignore
        const acc: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId } = await Account.findById(id)
        acc.updateOne({ role: 'Customer' }, (_err: Error) => {
            if (_err)
                return res.status(500).send({ msg: "We've got some problems with verify account, please try again later." })
            return res.send({ msg: 'Verify Success' })
        })
    }
    catch (err) {
        return res.status(404).send({ msg: 'Verify Failure' })
    }
}

// SIGN IN
export const AccountSignin = async (req: Request, res: Response, next: NextFunction) => {
    const { email_or_phone, password, googleToken } = req.body;
    if (!email_or_phone || (!password && !googleToken))
        return res.status(400).send({ msg: "Not enough information to Login" })

    try {
        // @ts-ignore
        const acc: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId } = await Account.findOne({$or: [{email: email_or_phone}, {phone: email_or_phone}]})
        if (password) {
            if (await argon2.verify(acc.password, password)) {
                const token: string = jwt.sign({ id: acc._id }, process.env.ACCESS_TOKEN_SECRET!)
                res.cookie('accessToken', token, { signed: true })
                res.send({ msg: "Login Success" })
            } else throw new Error()
        } else {
            const token: string = jwt.sign({ id: acc._id }, process.env.ACCESS_TOKEN_SECRET!)
            res.cookie('accessToken', token, { signed: true })
            res.send({ msg: "Login Success" })
        }
    } catch (err) {
        console.error(err);
        return res.status(400).send({ msg: "Login Failure" })
    }
}

// UPDATE
export const AccountUpdateInfo = async (req: Request, res: Response, next: NextFunction) => {
    const {name, birth, gender, address} = req.body
    const acc: Document = req.body.account
    acc.updateOne({name, birth, gender, address}, (err: Error) => {
        if(err) 
            return res.status(400).send({msg: err.message})
        return res.send({msg: 'Account updated'})
    })
}

export const AccountUpdateEmail = async (req: Request, res: Response, next: NextFunction) => {
    const {name, birth, gender, address} = req.body
    const acc: Document = req.body.account
    acc.updateOne({name, birth, gender, address}, (err: Error) => {
        if(err) 
            return res.status(400).send({msg: err.message})
        return res.send({msg: 'Account updated'})
    })
}

