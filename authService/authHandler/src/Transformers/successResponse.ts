import {res as Res} from "../services/cognito/index"

export interface responseData {
    code: string;
    message: string;
    data?: any;
}

export class CustomResponseHandler {
    static formatResponse(res: responseData): Res {
        const formattedResponse: Res = {
            result: {
                code: res.code,
                message: res.message,
                data: res?.data,
            },
        };

        return formattedResponse;
    }

    static handleAndSendResponse(data: responseData): Res {
        const formattedResponse = CustomResponseHandler.formatResponse(data);

        console.log("Response generated:", formattedResponse);

        return formattedResponse;
    }
}