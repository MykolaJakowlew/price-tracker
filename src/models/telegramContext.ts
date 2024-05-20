import { Context, NarrowedContext } from "telegraf";
import { UsersLeanDocument } from "./schemas";
import { Message, Update } from "telegraf/typings/core/types/typegram";
import { KeyedDistinct } from "telegraf/typings/core/helpers/util";

export interface TelegramContext<T> extends Context {
    user: UsersLeanDocument
}

export type TelegramContextArg =  NarrowedContext<TelegramContext<Update>, Update.MessageUpdate<KeyedDistinct<Message, "text">>>