import { Schema, model, Types } from 'mongoose';
import { type } from 'os';
import { Category } from './category';

export interface IProduct {
    _id: Types.ObjectId,
    // Basic Information
    name: string,
    code: string,
    desc: string,
    quantity: number,
    enable: boolean,
    colors: [{
        color: string,
        image_id: string,
        image_url: string,
    }]

    // Information
    category: Types.ObjectId,
    specs_link: any, // specs_id: value_id
    price: number,
    sale: number,

    // Features
    total_rate: number, // total rate
    comments: [{
        account: Types.ObjectId,
        message: string,
        rate: number,
        at: Date
    }]
}

export const productSchema = new Schema<IProduct>({
    // Information
    name: {type: String, required: [true, 'Product name cannot be empty'], trim: true},
    code: {type: String, required: [true, 'Product code cannot be empty'], unique: true, trim: true},
    desc: {type: String, default: '', trim: true},
    quantity: {type: Number, default: 0},
    enable: {type: Boolean, default: true},
    colors: [{
        color: {type: String, required: true, trim: true},
        image_id: String,
        image_url: String
    }],

    category: {type: Schema.Types.ObjectId, ref: 'Category'},
    specs_link: Schema.Types.Mixed,
    price: {type: Number, required: [true, 'Product price cannot be empty']},
    sale: {
        type: Number, 
        default: 0, 
        min: [0, 'Product discount percent must more than or equal 0'], 
        max: [1, 'Product discount percent must less than or equal 1']
    },
    total_rate: {type: Number, default: 0},
    comments: [{
        account: {type: Schema.Types.ObjectId, required: true, ref: 'Account'},
        message: String,
        rate: {type: Number, default: 0},
        at: {type: Date, default: Date.now}
    }]
}, { timestamps: true })

productSchema.methods.catespecs = async function (): Promise<any> {
    var category = await Category.findById(this.category)
    if(!category)
        throw Error("Cannot get Category")
    
    var specs: any = []
    category.specsModel.forEach(e => {
        const specs_id = e._id.toString()
        if(this.specs_link.hasOwnProperty(specs_id)) {
            for (let i = 0; i < e.values.length; i++) {
                if(e.values[i]._id == this.specs_link[specs_id]) {
                    specs.push({name: e.name, value:  e.values[i].value})
                }
            }
        }
    });
    return {category: category.name, specs}
}

productSchema.methods.info = async function() {
    var data = {
        name: this.name ?? "",
        code: this.code,
        desc: this.desc ?? "",
        category: "",
        specs: {},
        colors: this.colors,
        price: this.price,
        sale: this.sale,
        total_rate: this.total_rate
    }
    const catespecs = await this.catespecs() 
    if(!!catespecs) {
        data.category = catespecs.category,
        data.specs = catespecs.specs
    }
    return data
}

export const Product = model<IProduct>('Product', productSchema)