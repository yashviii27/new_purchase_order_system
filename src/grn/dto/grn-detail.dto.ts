import { IsInt } from 'class-validator';

export class GrnDetailDto {

  @IsInt()
  po_sr: number;

  @IsInt()
  pro_id: number;      

  @IsInt()
  grn_rec_qty: number;
}
