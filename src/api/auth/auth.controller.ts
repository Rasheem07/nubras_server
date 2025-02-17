import { Controller, Get, Post, Body, HttpException, HttpStatus, Res, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }
    
    @Throttle({ default: { limit: 1, ttl: 30000 } })
    @Post('login')
    async login(@Body() body: {contact: string}, @Res({ passthrough: true }) res: Response) {
        const { contact } = body;
        if (!contact) {
            throw new HttpException({ message: 'Contact is required', type: 'error' }, HttpStatus.BAD_REQUEST);
        }
        const response = await this.authService.login(contact);

        res.status(response.statusCode).json({ type: response.type, message: response.message });
    }

    @Post('register')
    async register(@Body() body: {username: string, contact: string, areaCode: string}, @Res({ passthrough: true }) res: Response) {
        const { username, contact, areaCode } = body;
        if (!username || !contact) {

            throw new HttpException({ message: 'Username, password and contact are required', type: 'error' }, HttpStatus.BAD_REQUEST);
        }

        const response = await this.authService.Register(username, contact, areaCode);
        
        res.status(response.statusCode).json({ type: response.type, message: response.message });
    }

    @Throttle({ default: { limit: 1, ttl: 30000 } })
    @Post('resend-otp')
    async resendOTP(@Body() body: {contact: string}) {
        return this.authService.resendOTP(body.contact);
    }

    @Post('verify-otp')
    async verifyOTP(@Body() otpData: {otp: string, contact: string}, @Res() res: Response) {
        const response = await this.authService.verifyOTP(otpData);
        console.log(response)
        res.cookie('accessToken', response.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000,
            sameSite: 'lax',
        });
        res.cookie('refreshToken', response.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
        });
        res.cookie('isLogined', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production', // Ensure security in production
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.status(200).json({ message: 'Login successful', type: 'success' });
    }


    @Delete('logout')
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('refreshToken');
        res.clearCookie('isLogined')
        res.clearCookie('isTailoredLogin')
        res.clearCookie('accessToken');
        return { message: 'Logged out successfully', type: 'success' };
    }

    @Post('/tailor/login')
    @Throttle({ default: { limit: 1, ttl: 30000 } })
    TailorLogin(@Body() tailor: {contact: string}) {
        return this.authService.TailorLogin(tailor);
    }

    
    @Post('tailor/verify-otp')
    async TailorverifyOTP(@Body() otpData: {otp: string, contact: string}, @Res() res: Response) {
        const response = await this.authService.verifyTailorOTP(otpData);
        res.cookie('accessToken', response.accessToken, {

            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000,

            sameSite: 'lax',
        });

        res.cookie('refreshToken', response.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
        });
        res.cookie('isTailoredLogin', true, {
            httpOnly: false,
            secure: false
        });
        res.status(200).json({ message: 'Login successful', type: 'success' });
    }

    @Throttle({ default: { limit: 1, ttl: 30000 } })
    @Post('tailor/resend-otp')
    async TailorresendOTP(@Body() body: {contact: string}) {
        return this.authService.resendTailorOTP(body.contact);
    }

}
