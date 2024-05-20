import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Links, LinksDocument, LinksLeanDocument, UrlTypes, Users, UsersDocument } from "models";
import { Model, Types } from "mongoose";
import { RozetkaPageParserService } from "./rozetka.pageParser.service";
import { ParserResult } from "models/amazon";
import { AmazonPageParserService } from "./amazon.pageParser.service";
import { QueueNames, RabbitMQService } from "./rabbitmq.service";
import { AsyncMessage } from "rabbitmq-client";

@Injectable()

export class LinkManagerService {
    constructor(
        @InjectModel(Links.name)
        private readonly Links: Model<LinksDocument>,
        @InjectModel(Users.name)
        private readonly Users: Model<UsersDocument>,
        private rozetkaPageParserService: RozetkaPageParserService,
        private rabbitMQService: RabbitMQService
    ) {

        this.rabbitMQService.consume(QueueNames.rozetka, async (msg: AsyncMessage) => {
            const link = new this.Links(msg.body)
            console.log(`We try to update link with _id ${link._id.toString()} and value ${link.url}`)
            const isUpdated = await this.update(link)
            console.log(`${link._id.toString()}  was updated`)
            if (isUpdated) {
                const subscribedUsers = await this.Users.find({
                    links: link._id
                })

                subscribedUsers.forEach((user => {
                    this.rabbitMQService.publish(
                        QueueNames.telegramNotifications,
                        { userId: user._id, linkId: link._id }
                    )
                }))
            }
        })
    }

    // @Cron(CronExpression.EVERY_HOUR)
    @Cron(CronExpression.EVERY_30_SECONDS)
    async execute() {
        const date = new Date()
        date.setHours(date.getHours() - 1)
        const docs = await this.Links.find({
            // receivedAt: { $lte: date }
        })

        console.log(`docs count:${docs.length}`)
        await Promise.all(docs.map(doc => {
            switch (doc.type) {
                case UrlTypes.ROZETKA: {
                    return this.rabbitMQService.publish(QueueNames.rozetka, doc.toObject())
                }
                default: {
                    console.warn(`Queue for link type ${doc.type} was not found`)
                }
            }
        }))
        // await Promise.all(docs.map(doc => this.update(doc)))
    }

    async update(doc: LinksLeanDocument): Promise<boolean> {
        const type = this.getLinkType(doc.url)
        const result = await this.getLinkData(doc.url, type)

        const currentLinkData = await this.Links.findById(doc._id)
        await this.updateLinkData(doc._id, result)

        return currentLinkData.price !== result.price.value
    }

    async getLinkData(link: string, type: UrlTypes): Promise<ParserResult> {

        if (type === UrlTypes.AMAZON) {
            return { title: "NOT_FOUND", price: { value: 0 } }
        }

        if (type === UrlTypes.ROZETKA) {
            const result = await this.rozetkaPageParserService.parser(link)
            return result
        }

        return {} as ParserResult
    }



    getLinkType(link: string) {
        if (!/^https?:\/\//.test(link)) {
            throw new Error(`Link has wrong format`)
        }

        if (/amazon/.test(link)) {
            return UrlTypes.AMAZON
        }

        if (/rozetka/.test(link)) {
            return UrlTypes.ROZETKA
        }

        return UrlTypes.OTHER
    }

    async updateLinkData(linkId: Types.ObjectId, data: ParserResult) {
        const oldLink = await this.Links.findOne({ _id: linkId })
        const newLink = await this.Links.findOneAndUpdate(
            { _id: linkId },
            {
                $set: {
                    name: data.title,
                    price: data.price.value,
                    currency: data.price.currency,
                    receivedAt: new Date()
                }
            },
            { new: true }
        )

        if (newLink.price !== oldLink.price) {
            console.log(`Price for ${data.title} was changed`)
        }
    }
}