import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { GrnMaster } from './schemas/grn-master.schema';
import { GrnDetail } from './schemas/grn-detail.schema';
import { CreateGrnDto } from './dto/create-grn.dto';
import { PurchaseMaster } from '../purchase/schemas/purchase-master.schema';
import { PurchaseDetail } from '../purchase/schemas/purchase-detail.schema';

interface FinalGrnRow {
  po_id: Types.ObjectId;
  po_sr: number;
  pro_id: number;
  grn_rec_qty: number;
  is_extra_stock: boolean;
}

@Injectable()
export class GrnService {
  constructor(
    @InjectModel(GrnMaster.name) private gmModel: Model<GrnMaster>,
    @InjectModel(GrnDetail.name) private gdModel: Model<GrnDetail>,
    @InjectModel(PurchaseMaster.name) private pmModel: Model<PurchaseMaster>,
    @InjectModel(PurchaseDetail.name) private pdModel: Model<PurchaseDetail>,
  ) {}

  // ==================================================
  // CREATE GRN (Supports Extra Stock on Closed PO)
  // ==================================================
  async createGrn(dto: CreateGrnDto) {
    if (!dto.po_no || !dto.po_no.trim()) {
      throw new BadRequestException('PO number is required');
    }

    const latestPO = await this.pmModel
      .findOne({ po_no: dto.po_no })
      .sort({ po_rev: -1 });

    if (!latestPO) throw new NotFoundException('PO not found');

    // ✅ Allow extra stock even if PO is closed
    if (latestPO.po_is_closed && !dto.allow_extra_stock) {
      throw new BadRequestException(
        'This PO is already closed. Enable allow_extra_stock to add more stock.',
      );
    }

    const poId = latestPO._id as Types.ObjectId;
    const poDetails = await this.pdModel.find({ po_id: poId });

    if (!poDetails.length) {
      throw new BadRequestException('No purchase details found for this PO');
    }

    const finalGrnDetails: FinalGrnRow[] = [];

    for (const d of dto.details) {
      const line = poDetails.find((x) => x.po_sr === d.po_sr);

      if (!line) throw new BadRequestException(`Invalid po_sr ${d.po_sr}`);

      if (Number(line.pro_id) !== Number(d.pro_id)) {
        throw new BadRequestException(`Product mismatch on po_sr ${d.po_sr}`);
      }

      // ✅ Total received quantity till now
      const receivedAgg = await this.gdModel.aggregate([
        { $match: { po_id: poId, po_sr: d.po_sr } },
        { $group: { _id: null, total: { $sum: '$grn_rec_qty' } } },
      ]);

      const received = receivedAgg[0]?.total || 0;
      const required = line.po_qty + (line.po_adj_qty || 0);
      const pending = required - received;

      if (pending <= 0 && !dto.allow_extra_stock) {
        throw new BadRequestException(
          `Product ${d.pro_id} already fully received. Enable allow_extra_stock to add more.`,
        );
      }

      finalGrnDetails.push({
        po_id: poId,
        po_sr: d.po_sr,
        pro_id: d.pro_id,
        grn_rec_qty: d.grn_rec_qty,
        is_extra_stock: pending <= 0,
      });
    }

    // ✅ Create GRN Master
    const grnMaster = await this.gmModel.create({
      grn_no: dto.grn_no,
      grn_date: dto.grn_date,
      po_id: poId,
    });

    await this.gdModel.insertMany(
      finalGrnDetails.map((d) => ({
        ...d,
        grn_id: grnMaster._id,
      })),
    );

    // ✅ Auto close PO if fully received
    await this.autoClosePO(poId);

    return {
      message: 'GRN Created Successfully ✅',
      po_no: latestPO.po_no,
      po_revision: latestPO.po_rev,
      grn_id: grnMaster._id,
    };
  }

  // ==================================================
  // AUTO CLOSE PO WHEN FULLY RECEIVED
  // ==================================================
  private async autoClosePO(poId: Types.ObjectId) {
    const poDetails = await this.pdModel.find({ po_id: poId });
    const grnDetails = await this.gdModel.find({ po_id: poId });

    let completed = true;

    for (const row of poDetails) {
      const received = grnDetails
        .filter((g) => g.po_sr === row.po_sr)
        .reduce((s, x) => s + x.grn_rec_qty, 0);

      const totalRequired = row.po_qty + (row.po_adj_qty || 0);

      if (received < totalRequired) {
        completed = false;
        break;
      }
    }

    if (completed) {
      await this.pmModel.updateOne({ _id: poId }, { po_is_closed: true });
    }
  }
}
