import { IsInt, IsNumber } from 'class-validator';

export class GrnDetailDto {

  @IsInt()
  po_sr: number;          

  pro_id: number;         

  @IsNumber()
  grn_rec_qty: number;    
}
