import {Elysia, t} from "elysia";
import {CustomError, CustomErrorHandler} from "./Transformers/errorClass";
import {auth} from "./routes/auth";
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import {httpLoggerPlugin} from "./plugins/morganPlugin";
import { logger, fileLogger, type InferContext } from '@bogeychan/elysia-logger';
import Logger from "./services/logger/winstonLogger";
import crypto from "crypto";


const loggerWinston = Logger.getInstance("Auth")
const ChildLogger = loggerWinston.child({ requestId:  crypto.randomUUID() })


const app = new Elysia()
    .use(auth)
    /*.use(httpLoggerPlugin())
    .use(
        fileLogger({
            file: './my.log',
            autoLogging: true,
            customProps(ctx: InferContext<typeof app>) {
                return {
                    params: ctx.params,
                    query: ctx.query,
                    isHttpLogger: ctx.httpLogger
                };
            }
        })
    )*/
    .use(swagger({
        documentation: {
            info: {
                title: 'Isolutionz Auth Service',
                version: '1.0.0'
            }
        },
        path: '/docs/auth/isolutionz'
    }))
    .use(cors())
    .error({
        CustomError: CustomError
    }).onError(({ code, error }: any, ctx: any) => {
        ChildLogger.error(error)
        return {
           error
        }
    }).trace(async ({ handle}: any) => {
        const { time, end } = await handle
        console.log('Handler took', (await end) - time)
    })
    .listen(4000)

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type ElysiaApp = typeof app

