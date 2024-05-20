import { Injectable } from "@nestjs/common";
import { AsyncMessage, Connection, Publisher } from 'rabbitmq-client'

export enum QueueNames {
    rozetka = 'rozetka',
    telegramNotifications = 'telegramNotifications'
}

@Injectable()
export class RabbitMQService {

    private rabbit: Connection;

    private publishers: Partial<Record<QueueNames, Publisher>> = {}
    private consumers: Partial<Record<QueueNames, boolean>> = {}
    constructor() {
        const rabbit = new Connection('amqp://myuser:mypassword@localhost:5671')
        rabbit.on('error', (err) => {
            console.log('RabbitMQ connection error', err)
        })
        rabbit.on('connection', async () => {
            console.log('Connection successfully (re)established')
            this.createQueueAndPublisher(rabbit, QueueNames.rozetka )
            this.createQueueAndPublisher(rabbit, QueueNames.telegramNotifications )
        })
        this.rabbit = rabbit
    }

    async createQueueAndPublisher(rabbit: Connection, queue: QueueNames) {
        await rabbit.queueDeclare({ queue })

        this.publishers[queue] = this.rabbit.createPublisher({
            confirm: true,
            queues: [{ queue }]
        })
    }

    async publish(queueName: QueueNames, data: any) {
        const publisher = this.publishers[queueName]

        if (!publisher) {
            throw new Error(`Publisher for queue ${queueName} des not exists`)
        }

        await publisher.send(queueName, data)
    }

    async consume(queueName: QueueNames, cb: (msg: AsyncMessage) => Promise<void>) {
        if (this.consumers[queueName]) {
            throw new Error(`Consumer for queue ${queueName} already exists`)
        }
        this.consumers[queueName] = true;
        this.rabbit.createConsumer({
            queue: queueName,
            queueOptions: { durable: false },
            // handle 2 messages at a time
            qos: { prefetchCount: 2 },
        },cb)
    }
}