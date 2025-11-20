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
  // 1) CREATE PURCHASE ORDER (auto-rate + amount calculation)
  // =========================================================================
  async createPurchase(dto: any) {
    if (!dto.details || dto.details.length === 0) {
      throw new Error('Purchase Order must have at least one item.');
    }

    // STEP 1: calculate sub_totals & amount
    let po_amount = 0;

    const detailRows = dto.details.map((d) => {
      const rate = d.po_rate ?? 0;
      const subTotal = d.po_qty * rate;
      po_amount += subTotal;

      return {
        po_id: undefined, // assign later
        po_sr: d.po_sr,
        pro_id: d.pro_id,
        po_qty: d.po_qty,
        po_rate: rate,
        po_sub_total: subTotal,
        po_adj_qty: d.po_adj_qty ?? 0,
      };
    });

    // STEP 2: create master
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

    // STEP 3: assign po_id and insert details
    detailRows.forEach((d) => (d.po_id = poMaster._id));
    await this.poDetailModel.insertMany(detailRows);

    return {
      message: 'Purchase Order Created Successfully',
      po_id: poMaster._id,
      po_no: poMaster.po_no,
    };
  }

  // =========================================================================
  // 2) REVISE PURCHASE ORDER (auto pending + auto rate inheritance)
  // =========================================================================
  async revisePurchase(po_no: string, dto: any) {
    try {
      // find active revision
      const oldPO: any = await this.poMasterModel.findOne({
        po_no,
        po_is_active: true,
      });

      if (!oldPO) throw new NotFoundException('Active PO Not Found');

      // fetch previous details
      const oldDetails = await this.poDetailModel.find({ po_id: oldPO._id });

      // fetch all revisions
      const allRevisions = await this.poMasterModel.find({ po_no });
      const poIds = allRevisions.map((p) => p._id);

      // fetch GRN for all revisions
      const grnDetails = await this.grnDetailModel
        .find({})
        .populate({ path: 'grn_id', select: 'po_id' });

      // old pending qty mapping
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

        const pending = row.po_qty - (received + (row.po_adj_qty || 0));
        oldPendingMap[row.po_sr] = pending > 0 ? pending : 0;
      });

      // deactivate old PO
      oldPO.po_is_active = false;
      await oldPO.save();

      // NEW MASTER — rate & amount will be recalculated later
      const newPO = await this.poMasterModel.create({
        po_no,
        po_date: dto.po_date,
        po_amount: 0, // temp, calculate later
        sup_id: oldPO.sup_id,
        transportation: oldPO.transportation,
        notes: oldPO.notes,
        po_rev_reason: dto.po_rev_reason,
        po_rev: oldPO.po_rev + 1,
        po_is_active: true,
        prev_po_id: oldPO._id,
      });

      // ==========================
      // NEW DETAILS + AUTO RATE + AUTO ADJ QTY
      // ==========================
      let newAmount = 0;

      const newDetailRows = dto.details.map((row) => {
        const rate =
          row.po_rate !== undefined
            ? row.po_rate
            : oldRateMap[row.po_sr] ?? 0; // auto inherit rate

        const adjQty = oldPendingMap[row.po_sr] ?? 0;
        const subTotal = row.po_qty * rate;
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

      // save details
      await this.poDetailModel.insertMany(newDetailRows);

      // update master with correct amount
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
  // 3) GET STATUS (ALL REVISIONS + GRN MERGE)
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

      const pending = row.po_qty - (received + (row.po_adj_qty || 0));

      return {
        ...row.toObject(),
        po_rec_qty: received,
        pending_qty: pending,
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
