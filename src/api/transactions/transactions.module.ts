import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService],  // Ensure this is here
  exports: [TransactionsService],    // Export if used in another module
})
export class TransactionsModule {}
