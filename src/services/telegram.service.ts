import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Context, Telegraf } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { message } from 'telegraf/filters';
import { InjectModel } from "@nestjs/mongoose";
import { Links, LinksDocument, TelegramContext, TelegramContextArg, UrlTypes, Users, UsersDocument } from "models";
import { Model, Types } from "mongoose";
import { AmazonPageParserService } from './amazon.pageParser.service'
import { RozetkaPageParserService } from './rozetka.pageParser.service'
import { ParserResult } from "models/amazon";
import { LinkManagerService } from "./linkManager.service";
import { QueueNames, RabbitMQService } from "./rabbitmq.service";
import { AsyncMessage } from "rabbitmq-client";

let bot: Telegraf<Context<Update>> | null = null;

@Injectable()
export class TelegramService {
    constructor(
        @InjectModel(Users.name)
        private Users: Model<UsersDocument>,
        @InjectModel(Links.name)
        private Links: Model<LinksDocument>,
        private configService: ConfigService,
        private linkManagerService: LinkManagerService,
        private rabbitMQService: RabbitMQService
    ) {
        const telegramToken = this.configService.getOrThrow('telegram.token')
        const domain = this.configService.getOrThrow('publicUrl')

        if (!bot) {
            bot = new Telegraf(telegramToken)

            bot.launch({
                webhook: {
                    domain,
                    path: '/telegram'
                }
            })

            this.init()
        }

        this.rabbitMQService.consume(QueueNames.telegramNotifications, async (msg: AsyncMessage) => {
            const body: { userId: Types.ObjectId, linkId: Types.ObjectId } = msg.body
            
            // const user = await this.Users.findById(body.userId)
            // const link = await this.Links.findById(body.linkId)
            const [user, link] = await Promise.all([
                this.Users.findById(body.userId),
                this.Links.findById(body.linkId)
            ])


            const message = [
                `Item by name ${link.name} has change price`,
                `new price is ${link.price} ${link.currnecy}`,
                `Price by link ${link.url}`,
            ].join('\\n')
            bot.telegram.sendMessage(user.telegramId, message)
        })
    }

    private init() {
        bot.on(message('text'), async (context: TelegramContextArg, next) => {
            const { from: { first_name, id, last_name, username } } = context

            const user = await this.Users.findOne({
                telegramId: id
            })

            if (!user) {
                const doc = new this.Users({
                    firstName: first_name,
                    lastName: last_name,
                    telegramId: id,
                    userName: username,
                    links: []
                })

                const user = await doc.save();
                context.user = user.toObject()
            } else {
                context.user = user.toObject()
            }

            return next()
        })

        bot.on(message('text'), async (ctx: TelegramContextArg, next) => {
            const { message: { text } } = ctx

            try {
                const type = this.linkManagerService.getLinkType(text)

                if (type === UrlTypes.OTHER) {
                    ctx.reply('We do not found type of this link. We will use standart logic')
                }

                let link = await this.Links.findOne({
                    url: text
                })

                if (!link) {
                    const doc = new this.Links({
                        url: text,
                        receivedAt: new Date(),
                        type,
                    })

                    link = await doc.save();

                }

                const { user } = ctx
                await this.Users.findOneAndUpdate(
                    { _id: user._id },
                    {
                        $addToSet: {
                            links: link._id
                        }
                    }
                )

                const parserResult = await this.linkManagerService.getLinkData(text, type);

                await this.linkManagerService.updateLinkData(link._id, parserResult)

                ctx.reply('Link was added')
                ctx.reply(`We found by this link item with\title: <b>${parserResult.title}</b>\nprice is <b>${parserResult.price.value} ${parserResult.price.currency}</b>`)
            } catch (err) {
                return ctx.reply(err.toString())
            }

        })
    }

    get bot(): Telegraf<Context<Update>> {
        return bot;
    }
}
