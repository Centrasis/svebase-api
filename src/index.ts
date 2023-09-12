import { Router, Request, Response } from 'express';
import { SVEAccount, SessionUserInitializer, LoginState } from 'svebase/dist/SVEAccount';
import { ServiceInfo } from './service_info';
import { Headers } from './headers';

export interface UsernameRequest {
    user_name: string;
}

function SVESetUp(router: Router) {
    router.get("/", (req: Request, res: Response) => { res.status(204); });

    router.get("/check", (req: Request, res: Response) => {
        res.json(ServiceInfo.get_status());
    });

    router.post("/login", (req: Request, res: Response) => {
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
                ServiceInfo.SESSION_STORAGE.set(Headers.get_auth_token(req), {
                    created: new Date(),
                    user: account
                });
                res.status(200).json(account.getInitializer());
            });
        }).catch(err => {
            res.status(500).send('Error while accessing Auth-API: ' + JSON.stringify(err));
        });
    });
}

export {
    SVESetUp
}