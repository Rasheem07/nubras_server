import { Controller, Post, Body, Res, Get, Req, Param } from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { TailorService } from './tailor.service';

@Controller('tailor')
export class TailorController {

    constructor(private readonly tailorService: TailorService) {}

    @Get('orders')
    async getOrders(@Req() req: Request) {
        return this.tailorService.getOrders(req.userId);
    }

    @Get('order/:id')
    async getOrderDetails(@Param('id') id: string) {
        return this.tailorService.getOrderDetails(id);
    }

    @Get()
    async getAllTailores() {
        return this.tailorService.getAllTailors()
    }
   
}

