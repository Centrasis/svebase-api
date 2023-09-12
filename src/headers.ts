import { Request } from 'express';


export class Headers {
    public static get_auth_token(req: Request): string | undefined {
        if (req.header("Authorization")) {
            return req.header("Authorization")?.replace("Bearer ", "");
        } else {
            return undefined;
        }
    }
}