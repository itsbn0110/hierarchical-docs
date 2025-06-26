import { SetMetadata } from '@nestjs/common';

// Dùng một hằng số cho key để đảm bảo sự nhất quán
export const IS_PUBLIC_KEY = 'isPublic';

// Decorator @Public()
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);