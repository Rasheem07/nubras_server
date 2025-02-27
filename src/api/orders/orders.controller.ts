import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Order, Transactions, Measurement, FabricInventory, Fabric, item } from '@prisma/client';
import { OrdersService } from './orders.service';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { prisma } from 'src/lib/prisma';
import { TransactionsService } from '../transactions/transactions.service';
import { RolesGuard } from 'src/guards/Role.guard';

@Controller('orders')
export class OrdersController {
    private client: Twilio;
    private from: string;

    constructor(private readonly ordersService: OrdersService, private configService: ConfigService, private readonly transactionsService: TransactionsService) {
        this.client = new Twilio(
            this.configService.get<string>('TWILIO_ACCOUNT_SID'),
            this.configService.get<string>('TWILIO_AUTH_TOKEN')

        );
        this.from = this.configService.get<string>('TWILIO_PHONE_NUMBER'); // Use your Twilio phone TWILIO_PHONE_NUMBER
    }
    @Get()
    async getOrders(): Promise<Order[]> {
        return this.ordersService.getOrders();
    }

    @Get('/customer/:getOrdersByCustomerId')
    async getOrdersByCustomerId(@Param('getOrdersByCustomerId') customerId: string): Promise<Order[]> {
        return this.ordersService.getOrdersByCustomerId(customerId);
    }

    @Get('/sales-person/:getOrdersBySalesPersonId')
    async getOrdersBySalesPersonId(@Param('getOrdersBySalesPersonId') salesPersonId: string): Promise<Order[]> {
        return this.ordersService.getOrdersBySalespersonId(salesPersonId);
    }

    @UseGuards(new RolesGuard(['ADMIN', 'EDITOR']))
    @Post('/create')
    async createOrder(@Body() data: { order: Order, items: item[],  transactions: Transactions[], fabrics: Fabric[], measurements: Measurement[] }) {

       await this.ordersService.createOrderWithRelations(data);



        // const phoneNumber = await prisma.customer.findFirst({
        //     where: {
        //         id: order.customerId
        //     },
        //     select: {
        //         phone: true,
        //     }
        // });


        // await this.client.messages.create({
        //     from: this.from,
        //     to: phoneNumber.phone,
        //     body: `Your order for ${order.productName} has been created successfully! Tracking your order at http://localhost:3001/orders/tracking/${order.trackingToken}`
        // });

        await prisma.auditLog.create({
            data: {
                actionType: "Order created",
                description: `Order with Invoice ID ${data.order.InvoiceId} successfully created!`
            }
        })

        return { type: "success", message: "Order created successfully" };

    }

    @Get('/tracking/:trackingToken')
    async trackingOrder(@Param('trackingToken') trackingToken: string): Promise<Order> {
        return this.ordersService.trackingOrder(trackingToken);
    }

    @Get('/:getOrderById')

    async getOrderById(@Param('getOrderById') InvoiceId: number): Promise<Order> {
        return this.ordersService.getOrderById(InvoiceId);
    }

    @Put('/update/:updateOrder')
    async updateOrder(@Param('updateOrder') InvoiceId: number, @Body() order: Order): Promise<Order> {
        console.log(order);
        return this.ordersService.updateOrder(InvoiceId, order);
    }

    @Delete('/cancel/:InvoiceId')
    async cancelOrder(@Param('InvoiceId') InvoiceId: number): Promise<{ type: string, message: string }> {
        const order = await this.ordersService.cancelOrder(InvoiceId);

        if (!order) {
            return { type: 'error', message: "Order not found" };
        }
        const phoneNumber = await prisma.customer.findUnique({
            where: {
                id: order.customerId
            },
            select: {
                phone: true
            }

        });

        if (order.status === 'cancelled') {
            return { type: 'error', message: "Order already cancelled" };
        }

        await this.client.messages.create({
            from: this.from,
            to: phoneNumber.phone,
            body: `Your order with ID  #${order.InvoiceId} has been cancelled!`

        });
        return { type: "success", message: "Order cancelled successfully" };
    }


    @Get('values/distinct')
    async getAllDistinctValues() {
        return this.ordersService.getAllDistinctValues();
    }


    @Delete('/delete/:deleteOrder')
    async deleteOrder(@Param('deleteOrder') InvoiceId: number): Promise<{ type: string, message: string }> {
        const order = await this.ordersService.deleteOrder(InvoiceId);

        if (!order) {
            return { type: 'error', message: "Order not found" };
        }

        // const phoneNumber = await prisma.customer.findUnique({
        //     where: {
        //         id: order.customerId
        //     },
        //     select: {
        //         phone: true
        //     }

        // });


        // await this.client.messages.create({
        //     from: this.from,
        //     to: phoneNumber.phone,
        //     body: `Your order # ${order.InvoiceId} has been deleted!`
        // });


        return { type: "success", message: "Order deleted successfully" };

    }


}



