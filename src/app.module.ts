import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { TelegramService } from './services/telegram.service';
import { TelegramController } from 'controllers/telegram.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Links, LinksSchema, Users, UsersSchema } from 'models';
import { AmazonPageParserService } from 'services/amazon.pageParser.service';
import { RozetkaPageParserService } from 'services/rozetka.pageParser.service';
import { LinkManagerService } from 'services/linkManager.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RabbitMQService } from 'services/rabbitmq.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodbUrl'),
        dbName: 'PriceTracker'
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Users.name, schema: UsersSchema },
      { name: Links.name, schema: LinksSchema },
    ])
  ],
  controllers: [AppController, TelegramController],
  providers: [RabbitMQService, AppService, TelegramService, AmazonPageParserService, RozetkaPageParserService, LinkManagerService],
})
export class AppModule { }
