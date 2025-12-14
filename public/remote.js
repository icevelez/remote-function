async function remoteFetch(fn_name, headers, args, remote_endpoint) {
    const formData = new FormData();
    for (let i = 0; i < args.length; i++) formData.append(i, args[i] && Object.getPrototypeOf(args[i]) === Object.prototype ? new File([JSON.stringify(args[i])], '.json') : args[i]);

    const response = await fetch(remote_endpoint, {
        method: 'POST',
        headers: {
            ...headers,
            'x-func-name': fn_name,
            'x-func-param-datatypes': JSON.stringify(args.map((arg) => arg == null ? "null" : arg === undefined ? "undefined" : typeof arg)),
        },
        body: formData,
    })

    if (response.status >= 400) throw new Error(await response.text());
    if (response.status < 200 || response.status > 299 || response.status === 204) return;

    const data = await response[response.headers['content-type'] === 'application/json' ? 'json' : 'text']();
    const response_type = response.headers.get("type");

    return (response_type === "number") ? +data : (response_type === "boolean") ? Boolean(data) : data;
}

/**
 * @param {string} remote_endpoint
 * @param {Record<string, string>} headers
 */
export function connectRemote(remote_endpoint, headers = {}) {
    return new Proxy({}, {
        get(_, fn_name) {
            return (...args) => remoteFetch(fn_name, headers, args, remote_endpoint)
        },
    });
}
