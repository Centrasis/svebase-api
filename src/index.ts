import { Router, Request, Response, Express as ExpressApp } from 'express';
import * as express from 'express';
import { SessionOptions } from 'express-session';
import * as compression from 'compression';
import { json as jsonBody, urlencoded as urlencodedBody } from 'body-parser';
import { express as expressUA } from 'express-useragent';
import * as ExpressSession from 'express-session';
import { SVEAccount, SessionUserInitializer, LoginState } from 'svebase/dist/SVEAccount';
import { ServiceInfo, TokenInfo, Status, StatusProvider, StorageIntegrity } from './service_info';
import { Headers } from './headers';
import * as crypto from "crypto";
import { check_authentication } from './middlewares'
import * as http from 'http';


export interface UsernameRequest {
    user_name: string;
}


export function getSessionUser(req: Request): Promise<SVEAccount> {
    return new Promise<SVEAccount>((resolve, reject) => {
        if (req.session && req.session.user) {
            resolve(req.session.user);
        } else {
            const body: UsernameRequest = <UsernameRequest>req.body;
            fetch(ServiceInfo.auth_api_host + "/sso/login/validate", {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + Headers.get_auth_token(req)
                },
                body: JSON.stringify(body)
            }).then(response => {
                response.json().then(response_body => {
                    const account: SVEAccount = new SVEAccount(<SessionUserInitializer>{
                        id: <number>response_body["id"],
                        name: <string>response_body["user_name"],
                        sessionID: <string>Headers.get_auth_token(req),
                        loginState: LoginState.LoggedInByUser
                    });
                    req.session.user = account;
                    resolve(account);
                }, err => reject(err));
            }).catch(err => {
                reject(err);
            });
        }
    });
}


function finalizeRouter(api_router: Router, session_name: string = 'sve-session', port: number = 3000, add_login_handling: boolean = true): ExpressApp {
    const app: ExpressApp = express();

    app.use(jsonBody());
    app.use(compression());
    app.use(urlencodedBody({ extended: false }));
    app.use(expressUA());

    const login_router = Router();
    const check_router = Router();

    const session_opts: SessionOptions = {
        name: session_name,
        secret: process.env.SECRET || crypto.randomBytes(20).toString('hex'),
        cookie: {
            secure: false,
            sameSite: true
        },
        resave: true,
        saveUninitialized: true
    };

    check_router.get("/", (req: Request, res: Response) => { res.sendStatus(204); });

    check_router.get("/check", (req: Request, res: Response) => {
        res.json(ServiceInfo.get_status());
    });

    // Create session handler
    const session_handler = ExpressSession(session_opts);
    api_router.use(session_handler);
    login_router.use(session_handler);

    // Create authentication handler
    api_router.use(check_authentication);

    login_router.post("/login", (req: Request, res: Response) => {
        getSessionUser(req).then(user => {
            res.status(200).json(user.getInitializer());
        }).catch(err => {
            res.status(500).send('Error while accessing Auth-API: ' + JSON.stringify(err));
        });
    });

    if (add_login_handling) {
        app.use("/auth", login_router);
    }
    app.use("/", check_router);
    app.use("/api", api_router);

    const server = http.createServer(app);
    server.listen(port, () => {
        console.log(ServiceInfo.api_name + ' is listening on port ' + port.toString() + "!");
    });

    return app;
}

export {
    ServiceInfo,
    TokenInfo,
    Status,
    StatusProvider,
    StorageIntegrity,
    finalizeRouter
}