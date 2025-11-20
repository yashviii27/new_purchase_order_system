import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PurchaseMasterDocument = PurchaseMaster & Document;

@Schema({ timestamps: true })
export class PurchaseMaster {

  @Prop({ required: true })
  po_no: string;

  @Prop({ required: true })
  po_date: Date;

  @Prop({ default: 0 })
  po_rev: number; // revision number

  @Prop()
  po_rev_reason?: string;

  @Prop({ default: true })
  po_is_active: boolean; // true = latest revision

  @Prop()
  po_amount?: number;

  @Prop()
  sup_id?: number;

  @Prop()
  transportation?: string;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseMaster' })
  prev_po_id?: Types.ObjectId; // previous revision reference
}

export const PurchaseMasterSchema = SchemaFactory.createForClass(PurchaseMaster);
