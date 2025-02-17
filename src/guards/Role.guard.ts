import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from "@nestjs/common";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly allowedRoles: string[]) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const userRole = request.role;

        console.log('userRole', userRole);
        console.log('allowedRoles', this.allowedRoles);
        if (!userRole || !this.allowedRoles.includes(userRole)) {
            throw new HttpException({type: 'error', message: `user with ${userRole} cannot access this endpoint!`}, HttpStatus.FORBIDDEN);
        }

        return true;
    }
}
