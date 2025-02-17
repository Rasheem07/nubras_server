import { Injectable } from '@nestjs/common';
import { prisma } from 'src/lib/prisma';
import { decrypt, encrypt } from 'src/utils/encryption';

@Injectable()
export class ConfigService {

  async getConfig(key: string): Promise<string> {
    const config = await prisma.config.findUnique({ where: { key } });
    if (!config) throw new Error('Config not found');
    return decrypt(config.value);
  }

  async getAllConfigs() {
    const configs = await prisma.config.findMany(); // Await here directly
    return configs.map(config => ({ 
      ...config, 
      value: decrypt(config.value) 
    }));
  }

  async setConfig(key: string, value: string, createdBy: string) {
    const encryptedValue = encrypt(value);
    return prisma.config.upsert({
      where: { key: key },
      update: { value: encryptedValue, userId: createdBy },
      create: { key, value: encryptedValue, userId: createdBy },
    });
  }
}
