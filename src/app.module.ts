import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PurchaseModule } from './purchase/purchase.module';
import { GrnModule } from './grn/grn.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/.env`,
    }),

    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGO_URI as string,
      }),
    }),

    // ORDER MATTERS!
    PurchaseModule,
    GrnModule,
  ],
})
export class AppModule {}
