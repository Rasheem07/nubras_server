import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Fabric, FabricInventory, Order } from '@prisma/client';
import * as crypto from 'crypto';
import { prisma } from 'src/lib/prisma';
@Injectable()

export class OrdersService {

    private prisma = prisma;
    async getOrders(): Promise<Order[]> {
        return prisma.order.findMany();
    }

    async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
        return prisma.order.findMany({ where: { customerId } });
    }

    async getOrdersBySalespersonId(salespersonId: string): Promise<Order[]> {
        return prisma.order.findMany({ where: { salesPersonId: salespersonId } });
    }




    async createOrder(order: Order, fabrics: Fabric[]): Promise<Order> {
        console.log(order);

        // Validate required fields
        const requiredFields = ['InvoiceId', 'branch', 'customerName', 'customerLocation', 'productName', 'salesPersonName', 'quantity', 'totalAmount'];
        const missingFields = requiredFields.filter(field => !order[field]);
        if (missingFields.length > 0) {
            throw new HttpException(`Missing required fields: ${missingFields.join(', ')}`, HttpStatus.BAD_REQUEST);
        }

        // Check entity existence
        const [service, customer, salesPerson] = await Promise.all([
            prisma.service.findUnique({ where: { name: order.productName } }),
            prisma.customer.findFirst({ where: { name: order.customerName } }),
            prisma.salesPerson.findFirst({ where: { name: order.salesPersonName } })
        ]);

        const missingEntities = [];
        if (!service) missingEntities.push(`Service: ${order.productName}`);
        if (!customer) missingEntities.push(`Customer: ${order.customerName}`);
        if (!salesPerson) missingEntities.push(`Sales Person: ${order.salesPersonName}`);

        if (missingEntities.length > 0) {
            throw new HttpException({ type: "error", message: `Missing entities: ${missingEntities.join(', ')}` }, HttpStatus.NOT_FOUND);
        }

        // Inventory validation
        if (order.type === "READY_MADE") {
            await this.checkProductInventory(order.productName, order.quantity);
        } else if (order.type === "CUSTOM_TAILORED") {
            for (const fabric of fabrics) {
                await this.checkFabricsInventory(fabrics, fabric.quantity);
            }
        }

        // Create Order
        const trackingToken = await this.generateTrackingToken(order.customerName);
        const newOrder = await prisma.order.create({
            data: { ...order, customerId: customer.id, salesPersonId: salesPerson.id, trackingToken }
        });

        // Update related records in parallel
        await Promise.all([
            prisma.service.update({ where: { name: order.productName }, data: { totalQuantitySold: { increment: order.quantity }, totalSalesAmount: { increment: order.totalAmount } } }),
            prisma.section.update({ where: { name: order.sectionName }, data: { totalSalesAmount: { increment: order.totalAmount }, totalQuantitySold: { increment: order.quantity } } }),
            prisma.customer.update({ where: { id: customer.id }, data: { totalOrders: { increment: 1 }, totalSpent: { increment: order.totalAmount } } }),
            prisma.salesPerson.update({ where: { id: salesPerson.id }, data: { totalOrders: { increment: 1 }, totalSalesAmount: { increment: order.totalAmount } } })
        ]);

        // Update Inventory
        await this.updateInventory(order, fabrics);
        return newOrder;
    }

    private async checkProductInventory(productName: string, quantity: number) {
        const productInventory = await prisma.productInventory.findFirst({ where: { productName } });
        if (!productInventory || productInventory.quantityAvailable < quantity) {
            throw new HttpException({ type: 'error', message: `insufficient stock for ${productName}, Available quantity: ${productInventory.quantityAvailable}, Requested quantity: ${quantity} ` }, HttpStatus.NOT_FOUND);
        }
    }

    private async checkFabricsInventory(fabrics: Fabric[], quantity: number) {
        for (const fabric of fabrics) {
        console.log(fabric)
            const fabricInventory = await prisma.fabricInventory.findFirst({ where: { fabricName: fabric.fabricName, type: fabric.type, color: fabric.color } });
            if(!fabricInventory) {
             throw new HttpException({type: 'error', message: `${fabric.fabricName} (${fabric.type}-${fabric.color}) Not found in the inventory`}, HttpStatus.NOT_FOUND)
            }
            console.log('fabric quantity in inventory', fabricInventory.quantityAvailable)
            if (!fabricInventory || fabricInventory.quantityAvailable < quantity) {
                throw new HttpException({
                    type: 'error', message: `Fabric does not exist or insufficient stock!
                    Available fabrics quantity: ${fabricInventory.quantityAvailable}
                    requested fabrics quantity: ${fabric.quantity}`
                }, HttpStatus.NOT_FOUND);
            }
        }
    }

    private async updateInventory(order: Order, fabrics: Fabric[]) {
        if (order.type === "READY_MADE") {
            const product = await prisma.productInventory.findFirst({ where: { productName: order.productName } });
            if (!product) {
                throw new HttpException('Product not found in inventory', HttpStatus.NOT_FOUND);
            }
            await prisma.productInventory.update({
                where: { id: product.id },
                data: { totalSalesAmount: { decrement: order.totalAmount }, quantityAvailable: { decrement: order.quantity } }
            });
        } else {
            await Promise.all(fabrics.map(fabric =>
                prisma.fabricInventory.update({
                    where: { fabricName: (fabric as any).name },
                    data: { totalSalesAmount: { decrement: order.totalAmount }, quantityAvailable: { decrement: order.quantity } }
                })
            ));
        }
    }


    async getOrderById(InvoiceId: string): Promise<Order> {
        return prisma.order.findUnique({ where: { InvoiceId } });
    }

    async updateOrder(InvoiceId: string, order: Order): Promise<Order> {
        console.log(order);
        return prisma.order.update({ where: { InvoiceId }, data: order });
    }


    async cancelOrder(InvoiceId: string): Promise<Order> {
        const order = await prisma.order.update({ where: { InvoiceId }, data: { status: 'cancelled' } });


        // Update related records
        await prisma.service.update({
            where: { name: order.productName },
            data: {
                totalQuantitySold: { decrement: order.quantity },
                totalSalesAmount: { decrement: order.totalAmount }
            }

        });

        await prisma.section.update({
            where: { name: order.sectionName },
            data: {
                totalSalesAmount: { decrement: order.totalAmount },
                totalQuantitySold: { decrement: order.quantity }
            }

        });

        await prisma.customer.update({
            where: { id: order.customerId },

            data: {
                totalOrders: { decrement: 1 },
                totalSpent: { decrement: order.totalAmount },
            }
        });


        await prisma.salesPerson.update({
            where: { id: order.salesPersonId },
            data: {
                totalOrders: { decrement: 1 },
                totalSalesAmount: { decrement: order.totalAmount }

            }

        });

        return order;
    }


    async deleteOrder(InvoiceId: string): Promise<Order> {
        return prisma.order.delete({ where: { InvoiceId } });
    }

    async generateTrackingToken(userId: string) {

        const token = crypto.randomBytes(32).toString('hex');
        return token;

    }

    async trackingOrder(trackingToken: string): Promise<Order> {
        const order = await prisma.order.findFirst({ where: { trackingToken: trackingToken } });
        if (!order) {
            throw new HttpException("Order not found", HttpStatus.NOT_FOUND);
        }
        return order;
    }

    async getAllDistinctValues() {
        const products = await prisma.service.findMany({
            distinct: ["name"],
            select: {
                id: true,
                name: true,
                sectionName: true,
                price: true,
                
            }
        });
    

    
        const customers = await prisma.customer.findMany({
            distinct: ["phone"],
            select: {
                id: true,
                name: true,
                phone: true,
                location: true
            }
        });
    
        const salesPersons = await prisma.salesPerson.findMany({
            distinct: ["name"],
            select: {
                id: true,
                name: true
            }
        });
    
        return { products, customers, salesPersons };
    }
    
}
