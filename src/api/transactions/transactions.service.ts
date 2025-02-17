import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Transactions } from '@prisma/client';
import { prisma } from 'src/lib/prisma';
@Injectable()
export class TransactionsService {

    async createTransaction(transaction: Transactions) {
        const customer = await prisma.customer.findFirst({
            where: { name: transaction.customerName }
        });
    
        if (!customer) {
            throw new HttpException({ type: 'error', message: 'Customer not found' }, HttpStatus.NOT_FOUND);
        }
    
        const totalAmount = await prisma.order.findFirst({
            where: { InvoiceId: transaction.orderId },
            select: { totalAmount: true }
        });
    
        if (!totalAmount) {
            throw new HttpException({ type: 'error', message: 'Order not found' }, HttpStatus.NOT_FOUND);
        }
    
        const totalPaid = await prisma.transactions.groupBy({
            by: ['orderId'],
            _sum: { amount: true },
            where: { orderId: transaction.orderId }
        });
    
        const totalPaidAmount = totalPaid.length > 0 ? totalPaid[0]?._sum?.amount || 0 : 0;
        const remainingBalance = totalAmount.totalAmount - totalPaidAmount;
    
        if (transaction.amount > remainingBalance) {
            throw new HttpException({
                type: 'error',
                message: 'Transaction amount exceeds the total amount payable'
            }, HttpStatus.NOT_ACCEPTABLE);
        }
    
        // ✅ Step 1: Create Transaction
        await prisma.transactions.create({
            data: {
                customerName: transaction.customerName,
                paymentType: transaction.paymentType,
                amount: transaction.amount,
                paymentMethod: transaction.paymentMethod,
                id: transaction.id,
                order: { connect: { InvoiceId: transaction.orderId } },
                customer: { connect: { id: customer.id } },
            }
        });
    
        // ✅ Step 2: Update Order Payment Amounts
        await prisma.order.update({
            where: { InvoiceId: transaction.orderId },
            data: {
                PaidAmount: { increment: transaction.amount },
                PendingAmount: { decrement: transaction.amount }
            }
        });
    
        // ✅ Step 3: Check Full Payment After Transaction Creation
        const updatedTotalPaid = totalPaidAmount + transaction.amount;
        if (updatedTotalPaid >= totalAmount.totalAmount) {
            await prisma.order.update({
                where: { InvoiceId: transaction.orderId },
                data: { paymentStatus: "FULL_PAYMENT", paymentDate: new Date() } // Prisma handles Date conversion
            });
    
            await prisma.auditLog.create({
                data: {
                    actionType: "Payment Completed",
                    description: `Full payment received for Order Invoice ID: ${transaction.orderId}`,
                },
            });
        }
    
        return { type: 'message', message: 'Transaction created successfully!' };
    }
    

    async getTransactions() {
        return prisma.transactions.findMany()
    }

    async getTransactionById(id: string) {
        return prisma.transactions.findUnique({
            where: { id }
        })
    }

    async updateTransaction(id: string, transaction: Transactions) {
        return prisma.transactions.update({
            where: { id },
            data: transaction
        })
    }

    async deleteTransaction(id: string) {
        return prisma.transactions.delete({
            where: { id }
        })
    }

    async getTransactionsByOrderId(orderId: string) {
        return prisma.transactions.findMany({
            where: { orderId }
        })
    }

}
