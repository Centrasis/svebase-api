import { Request, Response, NextFunction } from 'express';
import { SVEAccount } from 'svebase/dist/SVEAccount';


declare module 'express-session' {
    interface SessionData {
        user: SVEAccount | undefined;
    }
}


function check_authentication(req: Request, res: Response, next: NextFunction): void {
    if ((req.session.user) !== undefined && (req.session.user instanceof SVEAccount)) {
        return next();
    } else {
        res.status(401).send("No Authorizated-Session present!");
    }
}

export {
    check_authentication
}