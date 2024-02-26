import { signUpDetails, validCodes, validErrorName } from "../services/cognito";
import {
  CustomError,
  CustomErrorHandler,
  CustomErrorType,
} from "../Transformers/errorClass";
import jwt, { JsonWebTokenError, Jwt } from "jsonwebtoken";
import { CognitoJwtVerifier } from "aws-jwt-verify";

export const validateSignup = async (
  { username, password, name, email, phone }: signUpDetails,
  set: any
) => {
  try {
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const errorObject: CustomErrorType = new CustomError({
          code: validCodes.INVALID_REQUEST,
          details: {
            name: validErrorName.INVALID_PARAMS,
            message: "Invalid email format",
            statusCode: 400,
          },
        });
        set.status = 400;
        throw errorObject;
      }
    }

    if (phone) {
      const phoneRegex = /^\+\d{1,}(\d{11})$/;
      if (!phoneRegex.test(phone as string)) {
        const errorObject: CustomErrorType = new CustomError({
          code: validCodes.INVALID_REQUEST,
          details: {
            name: validErrorName.INVALID_PARAMS,
            message: "Invalid phone number format",
            statusCode: 400,
          },
        });
        set.status = 400;
        throw errorObject;
      }
    }

    return true;
  } catch (e) {
    if (e instanceof CustomError) {
      throw e;
    }
    // Handle other types of errors
    CustomErrorHandler.handleAndThrowError(e);
  }
};

async function fetchJwk(userPoolId: string) {
    const url = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
    }
    return await response.json();
  }
  

export const validateBearerToken = async (token: string) => {

//     let params;
//     let isValid: boolean = false;

//     const userpool = process.env.USERPOOL_ID as string
//     const clientId = process.env.CLIENT_ID;

//     const jwk = await fetchJwk(userpool);

//     console.log("jwk: ", jwk);

//     const verifier = CognitoJwtVerifier.create({
//         userPoolId: userpool,
//         tokenUse: "access",
//         clientId,
//         customJwtCheck: async ({ header, payload, jwk }) => {
//             const currentTime = Date.now() / 1000;
//             if (payload?.exp as number >= currentTime) {
                
//                 params = {
//                         code: validCodes.UNAUTHORIZED,
//                         name: "Unauthorized Access",
//                         message: "Expired Authentication Token",
//                 }
//                 CustomErrorHandler.handleAndThrowError(params);
//             }
//           },
//           jwk
//       });

      
//   try {
//     const payload = await verifier.verify(token);
//     console.log(payload);
//     verifier
//   .hydrate()
//   .catch((err) => {
//     console.error(`Failed to hydrate JWT verifier: ${err}`);
//     process.exit(1);
//   })
//   .then(() =>
//   payload.aud === clientId ?  isValid = true: isValid = false
//   );

//   return isValid;

//   } catch (e) {
//     console.error(e);
//   }

};


//docker inspect --format '{{range $key, $value := .NetworkSettings.Networks}}{{$key}}{{end}}' f5493aac2326
//docker inspect --format '{{range $key, $value := .NetworkSettings.Networks}}{{$value.IPAddress}}{{end}}' redis-master
//docker inspect f5493aac2326
//docker network rm isolutionz-network 
//docker exec -it redis-sentinel1 telnet redis-master 6379
