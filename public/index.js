import { connectRemote } from "./remote.js";

/** @import RemoteFunction from '../remote_api.js' */
/** @type {RemoteFunction} */
const REMOTE = connectRemote("/api/remote", {
    'x-auth': 'jeff'
});

const data = await REMOTE.example_function({
    example_data: "hello_world",
    test_map: new Map(),
    test_set: new Set([1, 2, 3, 4, 5]),
    test_date: new Date(),
    deeply_nested: {
        more_nest: {
            even_further_nest: new Map(),
        }
    },
    test_file: {
        nest_file: new File(['hello_from_client_as_file'], 'client_message.txt')
    },
})
console.log(data);
