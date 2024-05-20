import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'users' })
export class Users {
    @Prop({ required: true, index: true })
    telegramId!: number;

    @Prop({ default: '' })
    firstName!: string;

    @Prop({ default: '' })
    lastName!: string;

    @Prop({ default: '' })
    userName!: string;

    @Prop({ type: [Types.ObjectId], default: [] })
    links!: Types.ObjectId[];
}

export const UsersSchema = SchemaFactory.createForClass(
    Users,
);
export type UsersDocument = Users & Document;

export class UsersLeanDocument extends Users {
    _id!: Types.ObjectId;
}