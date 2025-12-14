/** @import { authInstance } from "./lib/auth.js" */

/**
 * @template {any} T
 */
export default class {

    #database = null;

    /** @type {ReturnType<typeof authInstance<any>>['context']} */
    #auth;

    /** @type {ReturnType<typeof authInstance<T>>['context']} */
    example_exposed_auth;

    /**
     * @param {any} database
     * @param {ReturnType<typeof authInstance<T>>['context']} auth
     */
    constructor(database, auth) {
        if (!database) throw new Error("no database adaptor passed");
        if (!auth) throw new Error("no auth adaptor passed");
        this.#database = database;
        this.#auth = auth;
    }

    /**
     * @param {{ age : number, name : string }} body
     * @param {File} file
     */
    greetings = async (body, file) => {

        console.log(this.#auth.getContext(), "\n", body, file);
        return { message: `Hello from server "${body.age} ${body.name}"`, date: new Date() };
    }

    /**
     * @param {string} body
     */
    console_log = async (body) => {
        console.log(body);
        return null;
    }
    /**
     * @param {number} a
     * @param {number} b
     */
    add_numbers = async (a, b) => {
        console.log(a, b, a + b);
        return a + b;
    }

    /**
     * This is a comment
     * @param {File} file
     */
    upload_file = async (file) => {
        console.log(this.#auth.getContext())
        console.log("Uploaded File:", file);
        return "Upload Sucessful!";
    }
}
