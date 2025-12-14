import { connectRemote } from "./remote.js";

/** @import RemoteFunction from '../remote_api.js' */
/** @type {RemoteFunction} */
const REMOTE = connectRemote("/api/remote", {
    'x-auth': 'this_is_an_example_jwt'
});

REMOTE.create_application({
    example_data: "hello_world"
})
