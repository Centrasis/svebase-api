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


function finalizeRouter(api_router: Router, session_name: string = 'sve-session', port: number = 3000): ExpressApp {
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

    check_router.get("/", (req: Request, res: Response) => { res.status(204); });

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
        const body: UsernameRequest = <UsernameRequest>req.body;
        fetch(ServiceInfo.auth_api_host + "/login/validate", {
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
                res.status(200).json(account.getInitializer());
            });
        }).catch(err => {
            res.status(500).send('Error while accessing Auth-API: ' + JSON.stringify(err));
        });
    });

    app.use("/auth", login_router);
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