/** @import http from 'http' */

const byte_to_megabyte = (byte) => byte * 1024 * 1024;

/**
 * @param {{ [key:string] : () => Promise<any> }} remote_fns
 * @param {{ max_request_size_in_mb : number, max_field_size_in_mb : number }} config
 */
export function remoteFunction(remote_fns, config) {
    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse<http.IncomingMessage>} res
     */
    return async (req, res) => {
        if (req.method !== 'POST') return;

        const contentType = req.headers["content-type"] || "";

        if (!contentType.startsWith("multipart/form-data")) {
            res.writeHead(400);
            res.end("Content-type must be \"multipart/form-data\"");
            return;
        }

        const boundary = contentType.split("boundary=")[1];
        if (!boundary) {
            res.writeHead(400);
            res.end("Missing boundary");
            return;
        }

        const func_param_data_types = JSON.parse(req.headers['x-func-param-datatypes']);
        if (!Array.isArray(func_param_data_types)) {
            res.writeHead(400);
            res.end(`Function parameter data types invalid`);
            return;
        }

        const func_name = req.headers['x-func-name'];
        const func = func_name ? remote_fns[func_name] : null;
        if (!func_name || !func) {
            res.writeHead(404);
            res.end(`Function "${func_name}" not found`);
            return;
        }

        try {
            const fields = await parseMultipart(req, boundary, func_param_data_types, byte_to_megabyte(config?.max_request_size_in_mb || 0), byte_to_megabyte(config?.max_field_size_in_mb || 0));
            let response = func(...fields);
            if (response instanceof Promise) response = await response;
            res.setHeaders(new Headers({ 'Type': response ? typeof response : "text", 'Content-type': typeof response === "object" ? "application/json" : "plain/text" }));
            res.end(response && Object.getPrototypeOf(response) === Object.prototype ? JSON.stringify(response) : typeof response === "object" ? response : response?.toString());
        } catch (error) {
            res.statusCode = 500;
            res.end(error.toString());
            return;
        }
    }
}

/**
 * Streaming multipart parser
 * @param {Readable} stream
 * @param {string} boundary
 * @param {string[]} func_param_data_types
 * @param {number} max_request_size
 * @param {number} max_body_size
 */
export function parseMultipart(stream, boundary, func_param_data_types, max_request_size, max_body_size) {
    return new Promise((resolve, reject) => {
        const dashBoundary = Buffer.from("--" + boundary);
        const dashBoundaryEnd = Buffer.from("--" + boundary + "--");
        const crlf = Buffer.from("\r\n");
        const headerEndSeq = Buffer.from("\r\n\r\n");
        const fields = [];

        let buffer = Buffer.allocUnsafe(64 * 1024);
        let bufferLen = 0;
        let state = 0; // 0 SEARCH, 1 HEADERS, 2 BODY
        let headerStart = 0;
        let bodyStart = 0;
        let currentName = null;
        let currentFilename = null;
        let currentSize = 0;
        let bodyChunks = [];
        let totalBodySize = 0;
        let paramIndex = 0;

        function ensure(size) {
            if (bufferLen + size <= buffer.length) return;
            const next = Buffer.allocUnsafe(Math.max(buffer.length * 2, bufferLen + size));
            buffer.copy(next, 0, 0, bufferLen);
            buffer = next;
        }

        function parseHeaders(buf) {
            const headers = Object.create(null);
            let start = 0;
            while (true) {
                const end = buf.indexOf(crlf, start);
                if (end === -1) break;
                const line = buf.subarray(start, end).toString();
                start = end + 2;
                const idx = line.indexOf(":");
                if (idx !== -1) headers[line.slice(0, idx).toLowerCase()] = line.slice(idx + 1).trim();
            }
            return headers;
        }

        function setupPart(headers) {
            const disp = headers["content-disposition"];
            if (!disp) return;

            currentName = /name="([^"]+)"/.exec(disp)?.[1] ?? null;
            currentFilename = /filename="([^"]*)"/.exec(disp)?.[1] ?? null;

            currentSize = 0;
            bodyChunks.length = 0;
        }

        function finishPart() {
            if (!currentName) return;

            const data = Buffer.concat(bodyChunks, currentSize);
            totalBodySize += data.length;

            if (max_request_size > 0 && totalBodySize > max_request_size) return reject("maximum request size exceeded");
            if (max_body_size > 0 && data.length > max_body_size) return reject("maximum field size exceeded");

            const type = func_param_data_types[paramIndex++];

            if (currentFilename) {
                fields[currentName] = currentFilename === ".json" ? decode(data.toString("utf8")) : currentFilename === "blob" ? new Blob([data]) : new File([data], currentFilename);
            } else {
                fields[currentName] = type === "number" ? +v : type === "boolean" ? v === "true" : v === "undefined" ? undefined : v === "null" ? null : v;
            }

            currentName = null;
            currentFilename = null;
        }

        stream.on("data", chunk => {
            ensure(chunk.length);
            chunk.copy(buffer, bufferLen);
            bufferLen += chunk.length;

            let i = 0;
            while (i < bufferLen) {
                if (state === 0) {
                    const idx = buffer.indexOf(dashBoundary, i);
                    if (idx === -1) break;
                    i = idx + dashBoundary.length;
                    if (buffer.indexOf(dashBoundaryEnd, idx) === idx) return resolve(fields);
                    if (buffer[i] === 13 && buffer[i + 1] === 10) i += 2;
                    headerStart = i;
                    state = 1;
                }

                if (state === 1) {
                    const idx = buffer.indexOf(headerEndSeq, headerStart);
                    if (idx === -1) break;

                    const headers = parseHeaders(buffer.subarray(headerStart, idx));
                    setupPart(headers);

                    i = idx + 4;
                    bodyStart = i;
                    state = 2;
                }

                if (state === 2) {
                    const idx = buffer.indexOf(dashBoundary, bodyStart);
                    if (idx === -1) break;

                    const chunkData = buffer.subarray(bodyStart, idx - 2);
                    bodyChunks.push(chunkData);
                    currentSize += chunkData.length;

                    finishPart();

                    i = idx + dashBoundary.length;
                    if (buffer[i] === 45 && buffer[i + 1] === 45) return resolve(fields);
                    if (buffer[i] === 13 && buffer[i + 1] === 10) i += 2;
                    headerStart = i;
                    state = 1;
                }
            }

            buffer.copy(buffer, 0, i, bufferLen);
            bufferLen -= i;
        });

        stream.on("end", () => resolve(fields));
        stream.on("error", reject);
    });
}

function deserialize(v) {
    if (v?.__t === "Map") return new Map(v.v);
    if (v?.__t === "RegExp") return new Regex(v.v);
    if (v?.__t === "Set") return new Set(v.v);
    if (v?.__t === "Date") return new Date(v.v);
    return v;
}

function decode(json) {
    return JSON.parse(json, (_, v) => deserialize(v));
}
