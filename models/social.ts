import { argon2d } from 'argon2';
import { debug } from 'console';
import { Schema, model, Types, Document } from 'mongoose';
import { config } from '../services/config';


export interface ISocial {
    followers: string[],
    comments: {
        email: string,
        message: string,
        at: Date
    }
}


// phone & email need to check unique in application level
export const socialSchema = new Schema<ISocial>({
    followers: [String],
    comments: [{
        email: {type: String, required: true},
        message: {type: String, required: true},
        at: {type: Date, default: Date.now}
    }]
})

export const Social = model<ISocial>('Server', socialSchema)