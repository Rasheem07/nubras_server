import { Controller, Get, Param } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService){}

    @Get(':trackingToken') 
    async getOrderDetails(@Param('trackingToken') trackingToken: string) {
        return this.orderService.getOrderDetails(trackingToken);
    }
}
