import { IsInt, IsNumber, IsOptional } from 'class-validator';

export class PurchaseDetailDto {
  @IsInt()
  po_sr: number;

  @IsInt()
  pro_id: number;

  @IsNumber()
  po_qty: number;

  @IsNumber()
  @IsOptional()
  po_adj_qty?: number;

  @IsNumber()
  @IsOptional()
  po_rate?: number;
}
