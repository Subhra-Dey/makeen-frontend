/**
 * Per-browser UI preferences kept in plain cookies (not secrets). Lives in a server-safe module:
 * a value exported from a 'use client' file is only a client reference on the server.
 */
export const RAIL_COOKIE = 'mk_rail';
