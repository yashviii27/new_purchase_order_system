import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GrnDetailDocument = GrnDetail & Document;

@Schema({ timestamps: true })
export class GrnDetail {

  @Prop({ type: Types.ObjectId, ref: 'GrnMaster', required: true })
  grn_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseMaster', required: true })
  po_id: Types.ObjectId;

  @Prop({ required: true })
  po_sr: number;

  @Prop({ required: true })
  pro_id: number;

  @Prop({ required: true })
  grn_rec_qty: number;

  // ✅ NEW FIELD
  @Prop({ default: false })
  is_extra_stock: boolean;
}

export const GrnDetailSchema = SchemaFactory.createForClass(GrnDetail);
