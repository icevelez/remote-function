/** @import http from 'http' */

/**
 * @template {any} T
 * @param {(request:http.IncomingMessage, response:http.ServerResponse<http.IncomingMessage>) => T} fn
 */
export function createAuth(fn) {
    let context;
    return {
        context: {
            /**
             * @returns {T}
             */
            getContext: () => context
        },
        /**
         * @param {http.IncomingMessage} req
         * @param {http.ServerResponse<http.IncomingMessage>} res
         */
        middleware: async (req, res) => {
            context = fn(req, res);
            if (context instanceof Promise) context = await context;
        },
    }
}
