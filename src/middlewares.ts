import {Request, Response, NextFunction} from 'express';
import { SVEAccount } from 'svebase/dist/SVEAccount';
import { ServiceInfo } from './service_info';


export interface AuthorizedRequest extends Request {
    user: SVEAccount;
}


function check_authentication(req: AuthorizedRequest, res: Response, next: NextFunction): void {
    if (req.header("Authorization")) {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (ServiceInfo.SESSION_STORAGE.has(token)) {
            req.user = ServiceInfo.SESSION_STORAGE.get(token).user;
            return next();
        }
    } else {
        res.status(400).send("No 'Authorization' header present");
    }
}

export {
    check_authentication
}