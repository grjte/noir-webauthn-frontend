
// TODO import max lengths
export const CLIENT_DATA_JSON_MAX_LEN = 1024;
export const AUTHENTICATOR_DATA_MAX_LEN = 2048;
export const SIGNATURE_MAX_LEN = 1024;
export const ID_MAX_LEN = 1023;
export const ATTESTATION_OBJECT_MAX_LEN = 2048;


export type BoundedVec = {
    storage: number[];
    len: number;
};

export const toBoundedVec = (name: string, input: ArrayBuffer | null, max_len: number): BoundedVec => {
    let array = input == null ? [] : [...new Uint8Array(input)];
    if (array.length > max_len) {
        throw Error(`${name} in registration credential is too long`);
    }
    return {
        storage: Object.assign(new Array(max_len).fill(0), array),
        len: array.length
    }
}