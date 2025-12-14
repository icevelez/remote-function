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
    new Map([[1, 2243], ['hello', '3253']]),
    new Set(['a', 'b', 'c', 'd']),
    new Date(),
    "XXXXX",
    1251352,
    { 'x': 'hello' },
)
