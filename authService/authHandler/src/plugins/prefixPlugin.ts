import { Elysia } from 'elysia'

export const prefixPlugin = (config: any) => {
    new Elysia({
        name: 'dynamic-prefix',
        seed: config,
        prefix: config?.prefix
    });

    console.log(config)
}
