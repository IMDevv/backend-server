import {Elysia, t} from "elysia";
import {cognitoService} from "../services/cognito";
import {validateSignup} from "../utils/validation";
import {CustomErrorHandler} from "../Transformers/errorClass";
import {prefixPlugin} from "../plugins/prefixPlugin";
import { bearer } from '@elysiajs/bearer';
import { validCodes } from "../services/cognito";


export const auth = new Elysia({prefix: '/auth', name: 'authRoute'}).use(bearer());

auth.group('/v1',(app: any) =>
    app.post('/sign-in', ({body, set}: any) => cognitoService.signIn(body, set), {
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    }).post('/sign-up', ({body, set}: any) => cognitoService.signup(body, set), {
        body: t.Object({
            username: t.String(),
            email: t.String(),
            phone: t.String(),
            name: t.String(),
            password: t.String(),
            confirmPassword: t.String(),
            mfaEnabled: t.Optional(t.Boolean()),
        }),

        beforeHandle: async ({ set, request: { headers }, body }: any) => {
             await validateSignup(body, set);
        }
    }).post('/update-attributes', ({body, set}: any) => cognitoService.updateUser(body, set), {
        body: t.Object({
            username: t.String(),
            email: t.Optional(t.String()),
            phone: t.Optional(t.String()),
            name: t.Optional(t.String()),
        }),

        beforeHandle: async ({ set, request: { headers }, body }: any) => {
            const {email , phone } = body;
            if(email | phone ) {
                await validateSignup(body, set);
            }else{
                return
            }
        }
    }).post('/oauth', ({body, set}: any) => cognitoService.oauthFlow(body, set), {
        body: t.Object({
            username: t.String(),
            name: t.Optional(t.String()),
            email: t.Optional(t.String()),
            phone: t.Optional(t.String()),
            email_verified: t.Optional(t.Boolean()),
            authType: t.Optional(t.String()),
        })
    }).post('/sign-out', ({body, set}: any) => cognitoService.signOut(body, set), {
        body: t.Object({
            accessToken: t.String(),
        })
    }).post('/forgot-password', ({body, set}: any) => cognitoService.forgotPassword(body, set), {
        body: t.Object({
            username: t.String(),
        })
    }).post('/verify-account', ({body, set}: any) => cognitoService.confirmSignup(body, set), {
        body: t.Object({
            username: t.String(),
            verificationCode: t.String(),
        })
    }).post('/reset-password', ({body, set}: any) => cognitoService.confirmPasswordReset(body, set), {
        body: t.Object({
            Username: t.String(),
            ConfirmationCode: t.String(),
            Password: t.String()
        }),

        transform({ body }: any) {
            const { ConfirmationCode } = body;
            const otp = ConfirmationCode;
            if (!isNaN(otp)) {
                body.ConfirmationCode = otp.toString();
            }
        }
    }) .guard(
        {
            beforeHandle({ bearer, set }: any) {
                if (!bearer) {
                    set.status = 401
                    set.headers[
                        'WWW-Authenticate'
                    ] = `Bearer realm='sign', error="invalid_request"`

                    let errorObject = {
                        code: validCodes.UNAUTHORIZED,
                        name: "Missing Token",
                        message: "Unauthorized Access",
                    }
                    CustomErrorHandler.handleAndThrowError(errorObject);
                }else{
                    // Verify token is valid aws jwt token

                }
            }
        },
        (app: Elysia) =>
            app.resolve(({ headers: {authorization} }) => { 
                return {  bearerToken: authorization.split(' ')[1] };
            }).get('/protected', ({ body, params }) => console.log("Protected Route body: "), {
                }).post('/refreshToken', ({body, set, bearerToken}: any) => cognitoService.refreshToken(body, bearerToken, set), {
                    body: t.Object({
                        username: t.String(),
                        deviceKey: t.Optional(t.String()),
                    })
                })
    )
)


