import { connectRemote } from "./remote.js";

/** @import RemoteFunction from '../remote_api.js' */
/** @type {RemoteFunction} */
const REMOTE = connectRemote("/api/remote", {
    'x-auth': 'this_is_an_example_jwt'
});

REMOTE.create_application({
    example_data: "hello_world",
    test_map: new Map(),
    test_set: new Set([1, 2, 3, 4, 5]),
    test_date: new Date(),
},
    [5, 4, 3, 1, 2],
    new Date(),
    new Map(),
    new Set(),
    "XXXXX"
)
