import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PurchaseDetailDocument = PurchaseDetail & Document;

@Schema({ timestamps: true })
export class PurchaseDetail {
  @Prop({ type: Types.ObjectId, ref: 'PurchaseMaster', required: true })
  po_id: Types.ObjectId;

  @Prop({ required: true })
  po_sr: number;

  @Prop({ required: true })
  pro_id: number;

  @Prop({ required: true })
  po_qty: number;

  @Prop({ default: 0 })
  po_rec_qty: number;

  @Prop({ default: 0 })
  po_adj_qty: number;

  @Prop()
  po_rate?: number;

  @Prop()
  po_sub_total?: number;
}

export const PurchaseDetailSchema = SchemaFactory.createForClass(PurchaseDetail);
