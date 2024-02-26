import {
    SecretsManagerClient,
    GetSecretValueCommand,
    ResourceNotFoundException
} from '@aws-sdk/client-secrets-manager';

const getSecret = async () => {

    const secret_name = "Dev-Isolutionz";

    const client = new SecretsManagerClient({
        region: process.env?.AWS_REGION,
    });

    let response;
    let secret;

    try {
        response = await client.send(
            new GetSecretValueCommand({
                SecretId: secret_name,
                VersionStage: "AWSCURRENT",
            })
        );

        if(response.SecretString){
            secret = JSON.parse(response.SecretString);
        }
       // console.log(secret)
        return secret;

    } catch (error) {
        if(error instanceof ResourceNotFoundException){
            throw new Error("Secret Not Found")
        }else{
            throw error;
        }

    }

}

export default getSecret;
