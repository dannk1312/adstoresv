import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import { destroy, uploadFromBuffer } from "../services/image";
import { Category } from "../models/category";

export const CategoryCreate = async (req: Request, res: Response, next: NextFunction) => {
    const { name, image_base64, specsModel } = req.body
    if (!name || !image_base64 || !specsModel)
        return res.status(400).send({ msg: config.err400 })
    const category = new Category({
        name: name,
        image_url: name + ".jpg",
        specsModel: specsModel
    })
    uploadFromBuffer("category", Buffer.from(image_base64, "base64"), (img_err, img_info) => {
        if (img_err) return res.status(500).send({ msg: config.err500 })
        category.image_id = img_info?.public_id!
        category.image_url = img_info?.url!
        category.save((save_err) => {
            if (save_err) {
                destroy(img_info?.public_id!)
                return res.status(400).send({ msg: config.err400 })
            }
            res.send({ msg: config.success, category: category })
        })
    })
}

export const CategoryUpdate = async (req: Request, res: Response, next: NextFunction) => { 

}

export const CategoryRead = async (req: Request, res: Response, next: NextFunction) => { 
    const { name } = req.body;
    if(!name)
        return res.status(400).send({msg: config.err400})
    
    Category.findOne({name: name}, (err: any, doc: any) => {
        if(err)
            return res.status(400).send({msg: config.err400})
        return res.send({msg: config.success, info: doc})
    })
}

export const CategoryList = async (req: Request, res: Response, next: NextFunction) => { 
    // @ts-ignore
    var data = await Category.surfaces();
    if(data)
        return res.send({msg: config.success, data})
    return res.status(400).send({msg: config.err400 })
}

export const CategoryDelete = async (req: Request, res: Response, next: NextFunction) => { 

}


