import { Injectable } from '@nestjs/common';
import { prisma } from 'src/lib/prisma';

@Injectable()
export class OrderService {

    async getOrderDetails(trackingToken: string) {
        return await prisma.order.findFirst({
            where: {
                trackingToken
            },
            select: {
                InvoiceId: true,
                branch: true,
                status: true,
                orderedFrom: true,
                Customer: true,
                createdAt: true,
                updatedAt: true,
                salesPersonName: true,
                paymentStatus: true,
                totalAmount: true,
                deliveryDate: true,
                paymentDate: true,
                Transactions: true,
                PendingAmount: true, 
                PaidAmount: true,
                assignedTo: true,
                items: true,
                fabric: true,
            }
        })
    }
}
