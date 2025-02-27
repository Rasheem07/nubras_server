import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { prisma } from 'src/lib/prisma';
import { Twilio } from 'twilio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private client: Twilio;
  private from: string;

  constructor(private configService: ConfigService) {
    this.client = new Twilio(this.configService.get<string>('TWILIO_ACCOUNT_SID'), this.configService.get<string>('TWILIO_AUTH_TOKEN'));
    this.from = this.configService.get<string>('TWILIO_PHONE_NUMBER');
  }

  async login(contact: string): Promise<{ type?: string; message?: string, statusCode?: number, accessToken?: string, refreshToken?: string }> {


    const prisma = new PrismaClient();

    const user = await prisma.user.findFirst({
      where: {
        contact: contact,
      },
    });



    if (!user) {
      throw new HttpException({ message: 'You are not authorized to access this application! Please contact your administrator.', type: 'error' }, HttpStatus.UNAUTHORIZED);
    }
    
    if (user.status === "Revoked") {
      throw new HttpException({ message: 'You have been revoked by the administrator! Please contact your administrator', type: 'error' }, HttpStatus.FORBIDDEN)
    }

    const OTP = Math.floor(100000 + Math.random() * 900000);
    await prisma.oTP.create({
      data: {
        contact: contact,
        OTP: OTP.toString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      },
    });

    //     const fullNumber = `${user.areaCode}${user.contact}`;
    //     console.log(fullNumber);
    //     await this.client.messages.create({
    //       body: `Hello ${user.username}, your login OTP for NUBRAS is ${OTP} ! Please verify your account to continue.

    // This OTP will expire in 15 minutes. DO NOT SHARE THIS OTP WITH ANYONE.`,
    //       from: this.from,
    //       to: fullNumber

    //     });


    return { type: 'success', message: 'OTP sent successfully', statusCode: HttpStatus.OK };
  }

  async Register(username: string, contact: string, areaCode: string): Promise<{ type?: string; message?: string, statusCode?: number, accessToken?: string, refreshToken?: string }> {


    const prisma = new PrismaClient();

    const user = await prisma.user.findFirst({
      where: {
        username: username,
        contact: contact,
      },
    });


    if (user) {
      return { type: 'error', message: 'User already exists', statusCode: HttpStatus.CONFLICT };
    }

    const newUser = await prisma.user.create({
      data: {
        username: username,
        areaCode: areaCode,
        contact: contact,
        role: 'VIEWER',

      },
    });

    return { type: 'success', message: 'User created successfully', statusCode: HttpStatus.CREATED };
  }


  async verifyOTP(otpData: { otp: string, contact: string }) {
    const otp = await prisma.oTP.findFirst({
      where: {
        OTP: otpData.otp,
        contact: otpData.contact
      },
    });

    if (!otp) {
      throw new HttpException({ message: 'Invalid OTP', type: 'error' }, HttpStatus.BAD_REQUEST);
    }

    if (otp.expiresAt < new Date()) {
      await prisma.oTP.delete({
        where: {
          id: otp.id
        },
      });
      throw new HttpException({ message: 'OTP expired', type: 'error' }, HttpStatus.BAD_REQUEST);
    }

    if (otp) {
      await prisma.oTP.delete({
        where: {
          id: otp.id
        },
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        contact: otpData.contact
      },
    });


    const token = jwt.sign({ id: existingUser?.id, role: existingUser?.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: existingUser?.id, role: existingUser?.role }, process.env.JWT_SECRET, { expiresIn: '7d' });


    return { accessToken: token, refreshToken: refreshToken };
  }

  async resendOTP(contact: string) {
    const exitingUser = await prisma.user.findFirst({
      where: {
        contact: contact
      },

    });

    if (!exitingUser) {
      throw new HttpException({ message: 'User not found', type: 'error' }, HttpStatus.NOT_FOUND);
    }


    const otp = await prisma.oTP.findFirst({
      where: {
        contact
      },
    });

    if (otp) {
      await prisma.oTP.delete({
        where: {
          id: otp.id
        },
      });
    }

    const OTP = Math.floor(100000 + Math.random() * 900000);
    await prisma.oTP.create({
      data: {
        contact: contact,
        OTP: OTP.toString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      },
    });

    const fullNumber = `${exitingUser.areaCode}${contact}`;


    await this.client.messages.create({
      body: `Hello ${exitingUser.username}, your login OTP is ${OTP}! Please verify your account to continue. 
      This OTP will expire in 15 minutes. DO NOT SHARE THIS OTP WITH ANYONE.`,
      from: this.from,
      to: fullNumber
    });



    return { message: 'OTP sent successfully', type: 'success' };
  }

  async TailorLogin(tailor: { contact: string }) {
    const { contact } = tailor;



    const exitingTailor = await prisma.employee.findFirst({
      where: {
        contact
      },
    });

    if (!exitingTailor) {
      throw new HttpException({ message: 'Tailor not found', type: 'error' }, HttpStatus.NOT_FOUND);
    }
    const fullNumber = `${exitingTailor.areaCode}${contact}`;
    const OTP = Math.floor(100000 + Math.random() * 900000);
    // await this.client.messages.create({
    //   body: `Hello ${exitingTailor.name}, your login OTP is ${OTP}! Please verify your account to continue. 
    //   This OTP will expire in 15 minutes. DO NOT SHARE THIS OTP WITH ANYONE.`,
    //   from: this.from,
    //   to: fullNumber

    // });

    await prisma.oTP.create({
      data: {
        contact: contact,
        OTP: OTP.toString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      },
    });

    return { message: 'OTP sent successfully', type: 'success' };
  }


  async verifyTailorOTP(otpData: { otp: string, contact: string }) {
    const otp = await prisma.oTP.findFirst({
      where: {
        OTP: otpData.otp,
        contact: otpData.contact
      },
    });

    if (!otp) {
      throw new HttpException({ message: 'Invalid OTP', type: 'error' }, HttpStatus.BAD_REQUEST);
    }

    if (otp.expiresAt < new Date()) {
      throw new HttpException({ message: 'OTP expired', type: 'error' }, HttpStatus.BAD_REQUEST);
    }

    if (otp) {
      await prisma.oTP.delete({
        where: {
          id: otp.id
        },
      });
    }

    const exitingTailor = await prisma.employee.findFirst({
      where: {
        contact: otpData.contact
      },
    });

    const token = jwt.sign({ id: exitingTailor?.id, role: exitingTailor?.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: exitingTailor?.id, role: exitingTailor?.role }, process.env.JWT_SECRET, { expiresIn: '7d' });


    return { accessToken: token, refreshToken: refreshToken };
  }


  async resendTailorOTP(contact: string) {
    const exitingTailor = await prisma.employee.findFirst({
      where: {
        contact: contact
      },
    });

    if (!exitingTailor) {
      throw new HttpException({ message: 'Tailor not found', type: 'error' }, HttpStatus.NOT_FOUND);
    }

    const otp = await prisma.oTP.findFirst({
      where: {
        contact
      },
    });

    if (otp) {
      await prisma.oTP.delete({
        where: {
          id: otp.id
        },
      });
    }

    const OTP = Math.floor(100000 + Math.random() * 900000);
    await prisma.oTP.create({
      data: {
        contact: contact,
        OTP: OTP.toString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      },
    });

    const fullNumber = `${exitingTailor.areaCode}${contact}`;

    await this.client.messages.create({
      body: `Hello ${exitingTailor.name}, your login OTP is ${OTP}! Please verify your account to continue. 
      This OTP will expire in 15 minutes. DO NOT SHARE THIS OTP WITH ANYONE.`,
      from: this.from,
      to: fullNumber
    });


    return { message: 'OTP sent successfully', type: 'success' };
  }
}
