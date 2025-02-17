import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Order, Transactions, Measurement, FabricInventory, Fabric } from '@prisma/client';
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
    async createOrder(@Body() data: { order: Order, transactions: Transactions[], fabrics: Fabric[], measurements: Measurement[] }) {
        console.log(data);
        const order = data.order;
        const invoice = await prisma.order.findFirst({
            where: {
                InvoiceId: order.InvoiceId
            }
        })
        if (invoice) {
            throw new HttpException({ type: 'error', message: 'Invoice number already exists! It must be a unique number' }, HttpStatus.NOT_ACCEPTABLE)
        }
        const transactions = data.transactions;
        const fabrics = data.fabrics;
        const measurements = data.measurements;
        console.log(data);
        const Order = await this.ordersService.createOrder(order, fabrics);

        console.log(fabrics)
        if (fabrics && fabrics.length > 0) {
            await Promise.all(
                fabrics.map(async (t) => {
                    const fabric = await prisma.fabric.create({
                        data: {
                            type: t.type,
                            color: t.color,
                            quantity: t.quantity,
                            orderInvoiceId: order.InvoiceId,
                            fabricName: (t as any).name, // No need for (t as any).name
                        },
                    });

                    await prisma.auditLog.create({
                        data: {
                            actionType: "Fabrics Reserved",
                            description: `Fabric ${(t as any).name} reserved for order with Invoice id: ${data.order.InvoiceId}`,
                        },
                    });

                    // Store fabric ID for measurement reference
                    t.id = fabric.id;
                })
            );
        }


        if (measurements && measurements.length > 0) {
            await Promise.all(
                measurements.map(async (m) => {
                    // Fetch fabric ID by fabric name
                    const fabric = await prisma.fabric.findFirst({
                        where: { fabricName: (m as any).fabricName },
                        select: { id: true, fabricName: true },
                    });

                    if (fabric) {
                        await prisma.measurement.create({
                            data: {
                                chest: m.chest,
                                endOfShow: m.endOfShow,
                                lengthBehind: m.lengthBehind,
                                LengthInFront: m.LengthInFront,
                                shoulder: m.shoulder,
                                neck: m.neck,
                                hands: m.hands,
                                middle: m.middle,
                                notes: m.notes,
                                orderId: order.InvoiceId,
                                fabric: {
                                    connect: { id: fabric.id }, // Correct way to reference fabric
                                },
                                order: {
                                    connect: { InvoiceId: order.InvoiceId }, // Ensure you're using the correct primary key
                                },
                                product: {
                                    connect: { name: order.productName }, // Ensure product exists with `name`
                                },
                            },
                        });

                        await prisma.auditLog.create({
                            data: {
                                actionType: "Measurement recorded",
                                description: `Measurement recorded for fabric ${fabric.fabricName}, Invoice id: ${data.order.InvoiceId}`,
                            },
                        });
                    }
                })
            );
        }

        if (transactions && transactions.length > 0) {
            await Promise.all(
                transactions.map(async (t) => {
                    await this.transactionsService.createTransaction({
                        ...t,
                        customerName: order.customerName,
                        orderId: order.InvoiceId,
                    });

                    await prisma.auditLog.create({
                        data: {
                            actionType: "Transaction recorded",
                            description: `Transaction recorded for Order with Invoice id: ${data.order.InvoiceId}`,
                        },
                    });
                })
            );
        }
        
        const transactionsTotal = await prisma.transactions.aggregate({
            _sum: {
                amount: true, // Replace 'amount' with the actual field you want to sum
            },
            where: {
                orderId: order.InvoiceId,
            },
        });

        // Default to 0 if there are no transactions
        const totalPaid = transactionsTotal._sum.amount || 0;

        if (totalPaid >= order.totalAmount) {
            await prisma.order.update({
                where: { InvoiceId: order.InvoiceId },
                data: { paymentStatus: "FULL_PAYMENT" , paymentDate: new Date().toISOString()}, // Adjust according to your schema
            });

            await prisma.auditLog.create({
                data: {
                    actionType: "Payment Completed",
                    description: `Full payment received for Order Invoice ID: ${order.InvoiceId}`,
                },
            });
        }



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

    async getOrderById(@Param('getOrderById') InvoiceId: string): Promise<Order> {
        return this.ordersService.getOrderById(InvoiceId);
    }

    @Put('/update/:updateOrder')
    async updateOrder(@Param('updateOrder') InvoiceId: string, @Body() order: Order): Promise<Order> {
        console.log(order);
        return this.ordersService.updateOrder(InvoiceId, order);
    }

    @Delete('/cancel/:InvoiceId')
    async cancelOrder(@Param('InvoiceId') InvoiceId: string): Promise<{ type: string, message: string }> {
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
            body: `Your order for ${order.productName} has been cancelled!`

        });
        return { type: "success", message: "Order cancelled successfully" };
    }


    @Get('values/distinct')
    async getAllDistinctValues() {
        return this.ordersService.getAllDistinctValues();
    }


    @Delete('/delete/:deleteOrder')
    async deleteOrder(@Param('deleteOrder') InvoiceId: string): Promise<{ type: string, message: string }> {
        const order = await this.ordersService.deleteOrder(InvoiceId);

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


        await this.client.messages.create({
            from: this.from,
            to: phoneNumber.phone,
            body: `Your order for ${order.productName} has been deleted!`
        });


        return { type: "success", message: "Order deleted successfully" };

    }


}



