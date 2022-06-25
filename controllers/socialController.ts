import { Account, AccountSurface, IAccount, IAddress, IBag, IBagItem } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { codeCache } from "../services/cache";
import { config, mess, regex } from "../services/config";
import { Bill } from "../models/bill";
import { Social } from "../models/social";
import { SendMail } from "../services/sender";

const SocialId = async () => {
    try {
        const docs = await Social.find({}).exec()
        if(!docs) throw Error()
        if(docs.length > 0) return docs[0]._id
        return (await (new Social({})).save())._id
    } catch(err) {
        console.log(err)
        return undefined
    }
}

export const Comment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const email: string = req.body.email
        const message: string = req.body.message
        const socialId = await SocialId()

        var error = ""
        if(!email) error += mess.errMissField + "[email]. "
        if(!message) error += mess.errMissField + "[message]. "
        if(!error) return res.status(400).send({msg: error})

        if(!socialId) throw Error()
        Social.findByIdAndUpdate(socialId, {$push: {comments: {email, message}}}).exec((err) => {
            if(err) return res.status(500).send({msg: mess.errInternal})
            return res.send({msg: mess.success})
        })
    } catch(err) {
        console.log(err)
        return res.status(500).send({msg: mess.errInternal})
    }
}

export const Follow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const email: string = req.body.email
        const socialId = await SocialId()
        if(!email) return res.status(400).send({msg: mess.errMissField + "[email]. "})
        if(!regex.email.test(email)) return res.status(400).send({msg: mess.errFormatField + "[email]. "})

        if(!socialId) throw Error()
        Social.findByIdAndUpdate(socialId, {$addToSet: {followers: email}}).exec((err) => {
            if(err) return res.status(500).send({msg: mess.errInternal})
            return res.send({msg: mess.success})
        })
    } catch(err) {
        console.log(err)
        return res.status(500).send({msg: mess.errInternal})
    }
}

export const ListFollows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 10000
        const socialId = await SocialId()

        if(!socialId) throw Error()
        Social.findById(socialId).select("followers").slice("followers", [skip, limit]).exec((err, doc) => {
            if(err || !doc) return res.status(500).send({msg: mess.errInternal})
            return res.send({msg: mess.success, data: doc.followers})
        })
    } catch(err) {
        console.log(err)
        return res.status(500).send({msg: mess.errInternal})
    }
}

export const DeleteFollows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const emails: string[] = req.body.emails
        const socialId = await SocialId()
        if(!emails) return res.status(400).send({msg: mess.errMissField + "[email]. "})

        if(!socialId) throw Error()
        Social.findByIdAndUpdate(socialId, {$pull: {followers: {$in: emails}}}).exec((err) => {
            if(err) return res.status(500).send({msg: mess.errInternal})
            return res.send({msg: mess.success})
        })
    } catch(err) {
        console.log(err)
        return res.status(500).send({msg: mess.errInternal})
    }
}

export const DeleteComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _ids: string[] = req.body._ids
        const socialId = await SocialId()
        if(!_ids) return res.status(400).send({msg: mess.errMissField + "[email]. "})

        if(!socialId) throw Error()
        Social.findByIdAndUpdate(socialId, {$pull: {comments: {_id: {$in: _ids}}}}).exec((err) => {
            if(err) return res.status(500).send({msg: mess.errInternal})
            return res.send({msg: mess.success})
        })
    } catch(err) {
        console.log(err)
        return res.status(500).send({msg: mess.errInternal})
    }
}

export const ListComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 10000
        const socialId = await SocialId()

        if(!socialId) throw Error()
        Social.findById(socialId).select("comments").slice("comments", [skip, limit]).exec((err, doc) => {
            if(err || !doc) return res.status(500).send({msg: mess.errInternal})
            return res.send({msg: mess.success, data: doc.followers})
        })
    } catch(err) {
        console.log(err)
        return res.status(500).send({msg: mess.errInternal})
    }
}

export const SendListEmails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const emails: string[] = req.body.emails
        const subject: string = req.body.subject
        const message: string = req.body.message

        var error = ""
        if(!emails) error += mess.errMissField + "[emails]. "
        if(!subject) error += mess.errMissField + "[subject]. "
        if(!message) error += mess.errMissField + "[message]. "
        emails.forEach(email => {
            SendMail(email, subject, message)
        })
        return res.send({msg: mess.success})
    } catch(err) {
        console.log(err)
        return res.status(500)
    }
}