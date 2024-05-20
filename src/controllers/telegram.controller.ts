import { Body, Controller, Get, Post } from '@nestjs/common';
import { TelegramService } from 'services/telegram.service';
import { Update } from 'telegraf/typings/core/types/typegram';

@Controller({ path: '/telegram' })
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) { }
  @Post()
  newMessage(@Body() body: Update): string {
    console.log(body)
    this.telegramService.bot.handleUpdate(body)
    return ''
  }
}
