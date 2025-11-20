import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GrnMasterDocument = GrnMaster & Document;

@Schema({ timestamps: true })
export class GrnMaster {

  @Prop({ required: true })
  grn_no: string;

  @Prop({ required: true })
  grn_date: Date;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseMaster', required: true })
  po_id: Types.ObjectId;     // <-- link to active PO
}

export const GrnMasterSchema = SchemaFactory.createForClass(GrnMaster);
