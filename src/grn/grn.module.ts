import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GrnController } from './grn.controller';
import { GrnService } from './grn.service';
import { GrnMaster, GrnMasterSchema } from './schemas/grn-master.schema';
import { GrnDetail, GrnDetailSchema } from './schemas/grn-detail.schema';

import { PurchaseModule } from '../purchase/purchase.module'; 
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GrnMaster.name, schema: GrnMasterSchema },
      { name: GrnDetail.name, schema: GrnDetailSchema },
    ]),

    
    PurchaseModule,
  ],
  controllers: [GrnController],
  providers: [GrnService],
  exports: [GrnService],
})
export class GrnModule {}
