import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { supabase } from "src/lib/supabase";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class UploadService {
  async saveFile(file: Express.Multer.File) {
    if (file.originalname) {

      const safeFilename = `${uuidv4()}-${file.originalname.replace(/\s+/g, "_")}`;
      const bucketName = "uploads"; // Make sure this exists in Supabase Storage

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(safeFilename, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) throw new HttpException({ type: 'error', message: 'File upload failed! Please try again later.' }, HttpStatus.FAILED_DEPENDENCY);

      // Get the public URL
      const { data: publicURL } = supabase.storage.from(bucketName).getPublicUrl(safeFilename);

      return { url: publicURL.publicUrl };
    } else {
      return null;
    }
  }
}
