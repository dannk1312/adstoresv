import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import { config } from '../services/config';
import express, { NextFunction, Request, Response } from 'express';
import { destroy, uploadFromBuffer } from "../services/image";
import { Category } from "../models/category";
import { Product } from "../models/product";

export const ProductCreate = async (req: Request, res: Response, next: NextFunction) => {
    const {name, code, desc, colors, category, specs_link, price, sale} = req.body
    if(!name || !code || !colors || colors.length == 0 || !category || !price || !sale) {
        return res.status(400).send({msg: config.err400 })
    }

    var product = new Product({name, code, desc, colors, category, specs_link, price, sale})
    var cat = await Category.findById(category);

    if(!cat)
        return res.status(400).send({msg: config.err400 })
    
}
