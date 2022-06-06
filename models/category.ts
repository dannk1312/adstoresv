import { Schema, model, Types } from 'mongoose';
import { Account } from './account';
import { IProduct } from './product';

export interface ICategory {
    _id: Types.ObjectId,
    name: string,
    // Cloudinary
    image_id: string,
    image_url: string,
    products: Types.ObjectId[],
    specsModel: [{
        _id: Types.ObjectId,
        name: string,
        values: [{
            _id: Types.ObjectId,
            value: string,
            products: [Types.ObjectId]
        }]
    }]
}


export const categorySchema = new Schema<ICategory>({
    name: {
        type: String,
        required: [true, "Category name cannot be empty"],
        unique: true,
        trim: true
    },
    image_id: { type: String, required: [true, "Category image cannot be empty"] },
    image_url: { type: String, required: [true, "Category image cannot be empty"] },
    products: [{ type: Schema.Types.ObjectId, required: true, ref: 'Product' }],
    specsModel: [{
        name: { type: String, required: [true, "Category specsModel name cannot be empty"] },
        values: [{
            value: { type: String, required: [true, "Category specsModel values unit cannot be empty"] },
            products: [{ type: Schema.Types.ObjectId, required: true, ref: 'Product' }]
        }]
    }]
}, { timestamps: true })

categorySchema
    .virtual('info')
    .get(function () {
        var specsModelReduce: any = []
        this.specsModel.forEach(m => {
            var values: any = []
            m.values.forEach(v => {values.push({_id: v._id, value: v.value, products_length: v.products.length})});
            specsModelReduce.push({_id:m._id, name: m.name, values});
        });

        return {
            _id: this._id,
            name: this.name,
            image_url: this.image_url,
            products_length: this.products.length,
            specsModel: specsModelReduce,
        };
    });

categorySchema
    .virtual('surface')
    .get(function () {
        return {
            _id: this._id,
            name: this.name,
            image_url: this.image_url,
            products_length: this.products.length,
        };
    });

categorySchema.statics.surfaces = async function (email: string): Promise<any> {
    var docs = await Category.find();
    var result: any = []
    docs.forEach(element => {
        // @ts-ignore
        result.push(element.surface)
    });
    return result
}

categorySchema.methods.checkProductSpecsLink = function(this: ICategory,specs_link: any): boolean {
    for (let i = 0; i < this.specsModel.length; i++) {
        var e = this.specsModel[i]
        var flag = false

        // @ts-ignore
        for (let j = 0; j < specs_link.length; j++) {
            var spec_id = e._id.toString()
            if(specs_link.hasOwnProperty(spec_id)) {
                flag = true
                // Check values
                var flag_value = false
                // @ts-ignore
                for (let a = 0; a < e.values.length; a++) {
                    var v = e.values[a]
                    if(specs_link[spec_id] == v._id) {
                        flag_value = true
                        break
                    }
                }
                if(!flag_value) return false
            }
        }
        if(!flag) return false
    }
    return true;
}

categorySchema.methods.checkNewSpecsModel = function (this: ICategory, newSpecsModel: any): boolean {
    if(!this.specsModel || this.products.length == 0) {
        return true;
    }
    // Check with old specsModel for sure that not delete the specs have products relate
    // @ts-ignore
    for (let i = 0; i < this.specsModel.length; i++) {
        var e = this.specsModel[i]
        var flag = false
        // @ts-ignore
        for (let j = 0; j < newSpecsModel.length; j++) {
            var new_e = newSpecsModel[i]
            if(e._id == new_e._id) {
                flag = true;
                // Check values
                var flag_value = false;
                // @ts-ignore
                for (let a = 0; a < e.values.length; a++) {
                    var v = e.values[a]
                    if(v.products.length > 0) {
                        for (let b = 0; j < new_e.values.length; j++) {
                            const new_v = new_e.values[j];
                            if(new_v._id == v._id) {
                                flag_value = true;
                                break;
                            }
                        }
                    } else flag_value = true;
                }
                if(!flag_value) return false
            }
        }
        if(!flag) return false
    }

    return true
}

categorySchema.methods.addProduct = function (this: ICategory, product: IProduct) {
    this.products.push(product._id)
    for (let i = 0; i < this.specsModel.length; i++) {
        var e = this.specsModel[i]
        var spec_id = e._id.toString();
        if(product.specs_link.hasOwnProperty(spec_id)) {
            // @ts-ignore
            for (let a = 0; a < e.values.length; a++) {
                var v = e.values[a]
                if(product.specs_link[spec_id] == v._id) {
                    v.products.push(product._id)
                    break
                }
            }
        }
    }
}


export const Category = model<ICategory>('Category', categorySchema)