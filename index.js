import { HttpMux } from "./lib/http.js";
import { serve } from "./middleware/serve.js";
import { remoteFunction } from "./middleware/remote.js";
import { authInstance } from "./lib/auth.js";
import Remote from "./remote_api.js";

const database = {};
const auth = authInstance((request, response) => {
    const auth_key = request.headers['x-auth'] || "";
    if (!auth_key) {
        response.writeHead(401);
        response.end("unauthorized")
        return "";
    }
    return `${request.headers['x-auth']}`;
})

const remote_functions = new Remote(database, auth.context);

const mux = new HttpMux();
mux.handle("/", serve('public'));

const rpcMux = new HttpMux();
rpcMux.handle("/api/remote", auth.middleware);
rpcMux.handle("/api/remote", remoteFunction(remote_functions, { max_request_size_in_mb: 1 }));

mux.handle("/", rpcMux.strip_prefix());

mux.serve(3000);
