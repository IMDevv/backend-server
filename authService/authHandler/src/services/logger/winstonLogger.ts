import winston, {createLogger, format, LoggerOptions, transports} from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ElasticsearchTransport, ElasticsearchTransportOptions } from 'winston-elasticsearch';
import apm from "elastic-apm-node";
import  {Logtail }  from '@logtail/node';
import  { LogtailTransport } from  '@logtail/winston';



class Logger {
    private static loggerInstance: winston.Logger;

     constructor() {}

    private static readonly errorFilter = winston.format((info, opts) => {
        return info.level === 'error' ? info : false;
    });

    private static readonly infoFilter = winston.format((info, opts) => {
        return info.level === 'info' ? info : false;
    });

    private static readonly httpFilter = winston.format((info, opts) => {
        return info.level === 'http' ? info : false;
    });
    private static LoggerOptionsExtended: winston.Logger;

    public static getInstance(serviceName: string): winston.Logger {
        if (!Logger.loggerInstance) {

            /*const apmElastic = apm.start({
                serviceName: "Auth Service",
                serverUrl: 'http://localhost:8200',
            })*/;

            const logtail = new Logtail(process.env.LOGTAIL_TOKEN as string || "JVhT3S2XrAZMEBMVok3VeuBf");

            Logger.loggerInstance = createLogger({
                level: process.env.LOG_LEVEL || 'info',
                format: format.combine(
                    format.timestamp({
                        format: 'YYYY-MM-DD hh:mm:ss.SSS A',
                    }),
                    format.prettyPrint(),
                    format.errors({ stack: true }),
                    format.splat(),
                    format.json()
                ),
                defaultMeta: { service: serviceName || 'Auth' },
                transports: [
                   // new transports.Console(),
                    new DailyRotateFile({
                        filename: `logs/${serviceName}/%DATE%-combined.log`,
                        datePattern: 'YYYY-MM-DD',
                        zippedArchive: true,
                        maxSize: '20m',
                        maxFiles: '14d',
                    }),
                    new DailyRotateFile({
                        filename: `logs/${serviceName}/%DATE%-error.log`,
                        datePattern: 'YYYY-MM-DD',
                        zippedArchive: true,
                        maxSize: '20m',
                        maxFiles: '14d',
                        level: 'error',
                        format: format.combine(Logger.errorFilter(), format.timestamp(), format.json()),
                    }),
                    new DailyRotateFile({
                        filename: `logs/${serviceName}/%DATE%-info.log`,
                        datePattern: 'YYYY-MM-DD',
                        zippedArchive: true,
                        maxSize: '20m',
                        maxFiles: '14d',
                        level: 'info',
                        format: format.combine(Logger.infoFilter(), format.timestamp(), format.json()),
                    }),

                    new DailyRotateFile({
                        filename: `logs/${serviceName}/%DATE%-http.log`,
                        datePattern: 'YYYY-MM-DD',
                        zippedArchive: true,
                        maxSize: '20m',
                        maxFiles: '14d',
                        level: 'http',
                        format: format.combine(Logger.httpFilter(), format.timestamp(), format.json()),
                    }),

                    new LogtailTransport(logtail)

                   /* new ElasticsearchTransport(<ElasticsearchTransportOptions>{
                       // apm: apmElastic,
                        level: 'error',
                        clientOpts: { node: 'https://localhost:9200' },
                        indexPrefix: "logs-isoultionz-error",
                        source: serviceName
                    }),

                    new ElasticsearchTransport(<ElasticsearchTransportOptions>{
                        //apm: apmElastic,
                        level: 'info',
                        clientOpts: { node: 'https://localhost:9200' },
                        indexPrefix: "logs-isoultionz-info",
                        source: serviceName
                    }),*/
                ],
                exceptionHandlers: [
                    new DailyRotateFile({
                        filename: `logs/${serviceName}/%DATE%-exception.log`,
                        datePattern: 'YYYY-MM-DD',
                        zippedArchive: true,
                        maxSize: '20m',
                        maxFiles: '14d',
                    }),
                ],
                rejectionHandlers: [
                    new DailyRotateFile({
                        filename: `logs/${serviceName}/%DATE%-rejections.log`,
                        datePattern: 'YYYY-MM-DD',
                        zippedArchive: true,
                        maxSize: '20m',
                        maxFiles: '14d',
                    }),
                ],
            });

            // Attach Daily Rotate event listener
            Logger.loggerInstance.transports.forEach(transport => {
                if (transport instanceof DailyRotateFile) {
                    transport.on('new', (filename: string) => {
                        console.log(`New log file created: ${filename}`);
                    });
                }
            });
        }

        return Logger.loggerInstance;
    }
}

export default Logger;
