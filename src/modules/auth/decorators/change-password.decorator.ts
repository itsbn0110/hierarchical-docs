import { SetMetadata } from "@nestjs/common";

// Dùng một hằng số cho key
export const IS_CHANGE_PASSWORD_ROUTE_KEY = "isChangePasswordRoute";

// Decorator @IsChangePasswordRoute()
export const IsChangePasswordRoute = () => SetMetadata(IS_CHANGE_PASSWORD_ROUTE_KEY, true);
