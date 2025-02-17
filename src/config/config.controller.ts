import { Controller, Get, Post, Body, UseGuards, Param, Req } from '@nestjs/common';
import { ConfigService } from './config.service';
import { RolesGuard } from 'src/guards/Role.guard';
import { Request } from 'express';

@Controller('config')
@UseGuards(new RolesGuard(['ADMIN'])) // Restrict to Admins Only
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get(':key')
  async getConfig(@Param('key') key: string) {
    return this.configService.getConfig(key);
  }

  @Get()
  async getAllConfigs() {
    return this.configService.getAllConfigs();
  }

  @Post()
  async updateConfig(@Body() { key, value }, @Req() req: Request) {
    const createdBy = req.userId;
    return this.configService.setConfig(key, value, createdBy);
  }
}
