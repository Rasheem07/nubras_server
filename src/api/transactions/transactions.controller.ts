import { Controller, Param, Post, Get, Put, Delete, Body } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transactions } from '@prisma/client';

@Controller('transactions')
export class TransactionsController {

    constructor(private readonly transactionsService: TransactionsService) {}

    @Post('create')
    createTransaction(@Body() transaction: Transactions) {
        return this.transactionsService.createTransaction(transaction)
    }

    @Get()
    getTransactions() {
        return this.transactionsService.getTransactions()
    }

    @Get(':id')
    getTransactionById(@Param('id') id: string) {
        return this.transactionsService.getTransactionById(id)
    }

    @Put(':id')
    updateTransaction(@Param('id') id: string, @Body() transaction: Transactions) {
        return this.transactionsService.updateTransaction(id, transaction)
    }       

    @Delete(':id')
    deleteTransaction(@Param('id') id: string) {
        return this.transactionsService.deleteTransaction(id)
    }
    
}
