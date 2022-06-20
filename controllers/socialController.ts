import { Account, AccountSurface, IAccount, IAddress, IBag, IBagItem } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { codeCache } from "../services/cache";
import { config, mess, regex } from "../services/config";
import { Bill } from "../models/bill";
import { Social } from "../models/server";

const ServerId = async () => {
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
        const serverId = await ServerId()

        var error = ""
        if(!email) error += mess.errMissField + "[email]. "
        if(!message) error += mess.errMissField + "[message]. "
        if(!error) return res.status(400).send({msg: error})

        if(!serverId) throw Error()
        Social.findByIdAndUpdate(serverId, {$push: {comments: {email, message}}}).exec((err) => {
            if(err) return res.status(500).send({msg: mess.errInternal})
            return res.send({msg: mess.success})
        })
    } catch(err) {
        console.log(err)
        return res.status(500).send({msg: mess.errInternal})
    }
}

export const Warning = async (message) => {
    try {
        const email: string = req.body.email
        const message: string = req.body.message
        const serverId = await ServerId()

        var error = ""
        if(!email) error += mess.errMissField + "[email]. "
        if(!message) error += mess.errMissField + "[message]. "
        if(!error) return res.status(400).send({msg: error})

        if(!serverId) throw Error()
        Social.findByIdAndUpdate(serverId, {$push: {comments: {email, message}}}).exec((err) => {
            if(err) return res.status(500).send({msg: mess.errInternal})
            return res.send({msg: mess.success})
        })
    } catch(err) {
        console.log(err)
        return res.status(500).send({msg: mess.errInternal})
    }
}