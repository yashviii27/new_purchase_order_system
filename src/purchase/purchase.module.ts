import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { PurchaseMaster, PurchaseMasterSchema } from './schemas/purchase-master.schema';
import { PurchaseDetail, PurchaseDetailSchema } from './schemas/purchase-detail.schema';
import { GrnDetail, GrnDetailSchema } from '../grn/schemas/grn-detail.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseMaster.name, schema: PurchaseMasterSchema },
      { name: PurchaseDetail.name, schema: PurchaseDetailSchema },

      
      { name: GrnDetail.name, schema: GrnDetailSchema },
    ]),
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [
    PurchaseService,
    MongooseModule,      
  ],
})
export class PurchaseModule {}
