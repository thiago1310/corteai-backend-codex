import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FaqService, CreateFaqDto } from './faq.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('faq')
export class FaqController {
  constructor(private readonly service: FaqService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreateFaqDto) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }
}
