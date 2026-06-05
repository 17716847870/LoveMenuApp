import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { UploadedImageFile } from './uploaded-file.type';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  async uploadImage(@UploadedFile() file: UploadedImageFile | undefined, @CurrentUserId() userId: bigint) {
    if (!file) {
      throw new BadRequestException('image file is required');
    }

    return dataResponse(await this.uploadsService.uploadImage(file, userId));
  }

  @Post('images/sign')
  async signImageUpload(@Body() body: { file_name?: string; mime_type?: string }, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.uploadsService.createImageUploadSignature(body, userId));
  }

  @Post('audio/sign')
  async signAudioUpload(@Body() body: { file_name?: string; mime_type?: string }, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.uploadsService.createAudioUploadSignature(body, userId));
  }
}
