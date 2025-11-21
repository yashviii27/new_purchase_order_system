import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { GrnMaster } from './schemas/grn-master.schema';
import { GrnDetail } from './schemas/grn-detail.schema';
import { CreateGrnDto } from './dto/create-grn.dto';
import { PurchaseMaster } from '../purchase/schemas/purchase-master.schema';
import { PurchaseDetail } from '../purchase/schemas/purchase-detail.schema';

@Injectable()
export class GrnService {
  constructor(
    @InjectModel(GrnMaster.name) private gmModel: Model<GrnMaster>,
    @InjectModel(GrnDetail.name) private gdModel: Model<GrnDetail>,
    @InjectModel(PurchaseMaster.name) private pmModel: Model<PurchaseMaster>,
    @InjectModel(PurchaseDetail.name) private pdModel: Model<PurchaseDetail>,
  ) {}

  async createGrn(dto: CreateGrnDto) {
    const poId = new Types.ObjectId(dto.po_id);

    // 1️⃣ Validate Purchase Order
    const poMaster = await this.pmModel.findById(poId);
    if (!poMaster) throw new NotFoundException('Purchase Order not found');

    if (!poMaster.po_is_active) {
      throw new BadRequestException('Cannot add GRN to inactive PO revision');
    }

    // 2️⃣ Fetch purchase lines
    const poDetails = await this.pdModel.find({ po_id: poId });

    if (!poDetails.length) {
      throw new BadRequestException('No purchase details found for this PO');
    }

    // 3️⃣ Validate each GRN detail
    for (const d of dto.details) {
      const line = poDetails.find((x) => x.po_sr === d.po_sr);

      if (!line) {
        throw new BadRequestException(
          `Invalid po_sr ${d.po_sr} for PO ${poMaster.po_no}`
        );
      }

      // ✅ SAFE comparison
      if (Number(line.pro_id) !== Number(d.pro_id)) {
        throw new BadRequestException(
          `Product mismatch on po_sr ${d.po_sr}. Expected ${line.pro_id} but received ${d.pro_id}`
        );
      }
    }

    // 4️⃣ Create GRN master
    const grnMaster = await this.gmModel.create({
      grn_no: dto.grn_no,
      grn_date: dto.grn_date,
      po_id: poId,
    });

    // 5️⃣ Insert GRN details
    const mapped = dto.details.map((d) => ({
      grn_id: grnMaster._id,
      po_id: poId,
      po_sr: d.po_sr,
      pro_id: d.pro_id,
      grn_rec_qty: d.grn_rec_qty,
    }));

    await this.gdModel.insertMany(mapped);

    return {
      message: 'GRN Created Successfully ✅',
      grn_master: grnMaster,
      grn_details: mapped,
    };
  }
}
