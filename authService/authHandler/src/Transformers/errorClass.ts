import Logger from "../services/logger/winstonLogger";


export interface AWSError extends Error {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    status?: number;
    $metadata?: {
            httpStatusCode?: number;
            requestId?: string;
            attempts?: number;
            totalRetryDelay?: number;
        };
}

interface CustomFormattedError {
        code: string;
        details?: {
            name: string;
            message?: string;
            statusCode?: number;
            $metadata?: {
                requestId?: string;
                attempts?: number;
                totalRetryDelay?: number;
            };
        };
        stack?: string;
}

export class CustomError extends Error {
    trace: CustomFormattedError;

    constructor(formattedError: CustomFormattedError) {
        super();
        this.trace = formattedError;
    }
}

export class CustomErrorHandler {
    private static logger = Logger.getInstance("Auth");

    static formatError(error: AWSError): CustomFormattedError {
        const formattedError: CustomFormattedError = {
                code: error.code || "SYSTEM_ERROR",
                details: {
                    name: error.name,
                    message:  error?.message,
                    statusCode: error.status,
                },
                stack: error?.stack,
            }

        if (error.$metadata) {
            formattedError.code = error.code || "UNKNOWN_AWS_ERROR";
            formattedError.details = {
                name: error?.name,
                message: error?.message,
                statusCode: error.$metadata?.httpStatusCode,
                $metadata: {
                    requestId: error.$metadata?.requestId,
                    attempts: error.$metadata?.attempts,
                    totalRetryDelay: error.$metadata?.totalRetryDelay,
                },
            };
        }

        return formattedError;
    }

    static handleAndThrowError(error: any): void {
        const formattedError = CustomErrorHandler.formatError(error);

        console.error("Error occurred handleThrowError:", formattedError);
        throw new CustomError(formattedError);
    }
}

export type CustomErrorType = CustomError;
