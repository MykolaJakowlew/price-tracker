import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { UrlTypes } from 'models/urlTypes';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'links' })
export class Links {
    @Prop({ required: true, index: true })
    url!: string;

    @Prop({ default: '' })
    name!: string;

    @Prop({ default: '', enum: UrlTypes })
    type!: UrlTypes;

    @Prop({ type: Number })
    price!: number;

    @Prop({ type: String })
    currnecy!: string;

    @Prop({ required: true })
    receivedAt!: Date;
}

export const LinksSchema = SchemaFactory.createForClass(
    Links,
);
export type LinksDocument = Links & Document;

export class LinksLeanDocument extends Links {
    _id!: Types.ObjectId;
}