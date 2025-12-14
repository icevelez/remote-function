import { HttpMux } from "./lib/http.js";
import { serve } from "./middleware/serve.js";
import { remoteFunction } from "./middleware/remote.js";
import Remote from "./remote_api.js";


const createNewAuthInstance = () => {
    let current_auth_user = "";

    return {
        context: {
            getUser: () => current_auth_user,
        },
        middleware: (req, res) => {
            const auth_key = req.headers['x-auth'] || "";
            current_auth_user = auth_key;
            console.log("current_auth_user", current_auth_user)
        }
    }
}

const database = {};
const auth = createNewAuthInstance();
const remote_functions = new Remote(database, auth.context);


const mux = new HttpMux();
mux.handle("/", serve('public'));

const rpcMux = new HttpMux();
rpcMux.handle("/", auth.middleware);
rpcMux.handle("/api/remote", remoteFunction(remote_functions, { max_request_size_in_mb: 1 }));

mux.handle("/", rpcMux.strip_prefix());

mux.serve(3000);
