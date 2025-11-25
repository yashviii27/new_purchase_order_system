import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseRevisionDto } from './dto/purchase-revision.dto';

@Controller('api/purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  async create(@Body() dto: CreatePurchaseDto) {
    return this.purchaseService.createPurchase(dto);
  }

  @Post(':po_no/revision')
  async revise(
    @Param('po_no') po_no: string,
    @Body() dto: PurchaseRevisionDto,
  ) {
    return this.purchaseService.revisePurchase(po_no, dto);
  }

  // ✅ GET ALL PO STATUS
  @Get('status')
  async getAllStatus() {
    return this.purchaseService.getAllPoStatus();
  }

  // ✅ GET SINGLE PO STATUS (po_no OR ObjectId)
  @Get(':id/status')
  async getSingleStatus(@Param('id') id: string) {
    return this.purchaseService.getPoStatus(id);
  }
}
