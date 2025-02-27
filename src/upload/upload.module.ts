import { Module } from "@nestjs/common";
import { UploadService } from "./upload.service";

@Module({
  providers: [UploadService],
  exports: [UploadService], // 👈 Export UploadService for use in other modules
})
export class UploadModule {}
