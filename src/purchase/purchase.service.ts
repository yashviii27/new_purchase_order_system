import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PurchaseMaster } from './schemas/purchase-master.schema';
import { PurchaseDetail } from './schemas/purchase-detail.schema';
import { GrnDetail } from '../grn/schemas/grn-detail.schema';

@Injectable()
export class PurchaseService {
  constructor(
    @InjectModel(PurchaseMaster.name)
    private readonly poMasterModel: Model<PurchaseMaster>,

    @InjectModel(PurchaseDetail.name)
    private readonly poDetailModel: Model<PurchaseDetail>,

    @InjectModel(GrnDetail.name)
    private readonly grnDetailModel: Model<GrnDetail>,
  ) {}

  // =========================================================================
  // CREATE PURCHASE ORDER
  // =========================================================================
  async createPurchase(dto: any) {
    if (!dto.details || dto.details.length === 0) {
      throw new Error('Purchase Order must have at least one item.');
    }

    let po_amount = 0;

    const detailRows = dto.details.map((d) => {
      const rate = d.po_rate ?? 0;
      const subTotal = d.po_qty * rate;
      po_amount += subTotal;

      return {
        po_id: undefined,
        po_sr: d.po_sr,
        pro_id: d.pro_id,
        po_qty: d.po_qty,
        po_rate: rate,
        po_sub_total: subTotal,
        po_adj_qty: 0,
      };
    });

    const poMaster = await this.poMasterModel.create({
      po_no: dto.po_no,
      po_date: dto.po_date,
      po_rev: 0,
      po_amount,
      sup_id: dto.sup_id,
      transportation: dto.transportation,
      notes: dto.notes,
      po_rev_reason: dto.po_rev_reason ?? null,
      po_is_active: true,
    });

    detailRows.forEach((d) => (d.po_id = poMaster._id));
    await this.poDetailModel.insertMany(detailRows);

    return {
      message: 'Purchase Order Created Successfully',
      po_id: poMaster._id,
      po_no: poMaster.po_no,
    };
  }

  // =========================================================================
  // REVISE PURCHASE ORDER
  // =========================================================================
  async revisePurchase(po_no: string, dto: any) {
    try {
      const oldPO: any = await this.poMasterModel.findOne({
        po_no,
        po_is_active: true,
      });

      if (!oldPO) throw new NotFoundException('Active PO Not Found');

      const oldDetails = await this.poDetailModel.find({ po_id: oldPO._id });
      const allRevisions = await this.poMasterModel.find({ po_no });
      const poIds = allRevisions.map((p) => p._id);

      const grnDetails = await this.grnDetailModel
        .find({})
        .populate({ path: 'grn_id', select: 'po_id' });

      const oldPendingMap: Record<number, number> = {};
      const oldRateMap: Record<number, number> = {};

      oldDetails.forEach((row) => {
        oldRateMap[row.po_sr] = row.po_rate ?? 0;

        const received = grnDetails
          .filter((g) => {
            const grnPoId = (g.grn_id as any)?.po_id;
            return (
              grnPoId &&
              poIds.some((pid) => pid.equals(grnPoId)) &&
              g.po_sr === row.po_sr
            );
          })
          .reduce((sum, x) => sum + (x.grn_rec_qty || 0), 0);

        const totalRequired = row.po_qty + (row.po_adj_qty || 0);
        const pending = totalRequired - received;

        oldPendingMap[row.po_sr] = pending > 0 ? pending : 0;
      });

      oldPO.po_is_active = false;
      await oldPO.save();

      const newPO = await this.poMasterModel.create({
        po_no,
        po_date: dto.po_date,
        po_amount: 0,
        sup_id: oldPO.sup_id,
        transportation: oldPO.transportation,
        notes: oldPO.notes,
        po_rev_reason: dto.po_rev_reason,
        po_rev: oldPO.po_rev + 1,
        po_is_active: true,
        prev_po_id: oldPO._id,
      });

      let newAmount = 0;

      const newDetailRows = dto.details.map((row) => {
        const rate =
          row.po_rate !== undefined ? row.po_rate : oldRateMap[row.po_sr] ?? 0;

        const adjQty = oldPendingMap[row.po_sr] ?? 0;
        const totalRequired = row.po_qty + adjQty;
        const subTotal = totalRequired * rate;

        newAmount += subTotal;

        return {
          po_id: newPO._id,
          po_sr: row.po_sr,
          pro_id: row.pro_id,
          po_qty: row.po_qty,
          po_rate: rate,
          po_sub_total: subTotal,
          po_adj_qty: adjQty,
        };
      });

      await this.poDetailModel.insertMany(newDetailRows);

      newPO.po_amount = newAmount;
      await newPO.save();

      return {
        message: 'Purchase Order Revised Successfully',
        po_no,
        new_po_id: newPO._id,
      };
    } catch (err) {
      console.log('REVISION ERROR => ', err);
      throw err;
    }
  }

  // =========================================================================
  // GET STATUS (CORRECTED PENDING LOGIC)
  // =========================================================================
  async getPoStatus(id: string) {
    let poMaster: any = null;

    if (Types.ObjectId.isValid(id)) {
      poMaster = await this.poMasterModel.findById(id);
    }
    if (!poMaster) {
      poMaster = await this.poMasterModel.findOne({
        po_no: id,
        po_is_active: true,
      });
    }
    if (!poMaster) throw new NotFoundException('PO Not Found');

    const allRevisions = await this.poMasterModel.find({
      po_no: poMaster.po_no,
    });
    const poIds = allRevisions.map((p) => p._id);

    const poDetails = await this.poDetailModel.find({
      po_id: poMaster._id,
    });

    const grnDetails = await this.grnDetailModel
      .find({})
      .populate({
        path: 'grn_id',
        select: 'po_id grn_no grn_date',
      });

    const finalData = poDetails.map((row) => {
      const received = grnDetails
        .filter((g) => {
          const grnPoId = (g.grn_id as any)?.po_id;
          return (
            grnPoId &&
            poIds.some((pid) => pid.equals(grnPoId)) &&
            g.po_sr === row.po_sr
          );
        })
        .reduce((sum, x) => sum + (x.grn_rec_qty || 0), 0);

      const totalRequired = row.po_qty + (row.po_adj_qty || 0);
      const pending = totalRequired - received;

      return {
        ...row.toObject(),
        po_rec_qty: received,
        pending_qty: pending < 0 ? 0 : pending,
        status: pending <= 0 ? 'Completed' : 'Pending',
      };
    });

    return {
      message: 'Success',
      poMaster,
      details: finalData,
    };
  }
}
