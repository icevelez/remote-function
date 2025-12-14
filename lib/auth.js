import http from 'http';

/**
 * @template {any} T
 * @param {(request:http.IncomingMessage, response:http.ServerResponse<http.IncomingMessage>) => T} middleware
 */
export function authInstance(middleware) {
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
        middleware: (req, res) => {
            context = middleware(req, res)
        },
    }
}
