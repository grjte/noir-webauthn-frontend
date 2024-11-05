import { BarretenbergBackend, CompiledCircuit } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import authenticationCircuit from "../../../noir_webauthn_authentication/target/noir_webauthn_authentication.json";
import { BoundedVec, toBoundedVec, CLIENT_DATA_JSON_MAX_LEN, ID_MAX_LEN, SIGNATURE_MAX_LEN, AUTHENTICATOR_DATA_MAX_LEN } from "./utils";

// Circuit tools setup
// Preloaded so the server starts downloading early and minimize latency.
const backend = new BarretenbergBackend(authenticationCircuit as CompiledCircuit, { threads: 4 });
const authentication = new Noir(authenticationCircuit as CompiledCircuit);
authentication.execute({}).catch((_) => {
    import("@aztec/bb.js");
});

type AuthenticationInput = {
    challenge: number[],
    credential: AuthenticationCredentialInput
}

type AuthenticationCredentialInput = {
    id: BoundedVec,
    raw_id: BoundedVec,
    response: AuthenticatorAssertionResponseInput,
    credential_type: string
}

type AuthenticatorAssertionResponseInput = {
    authenticator_data: BoundedVec,
    client_data_json: BoundedVec,
    signature: BoundedVec,
    user_handle: BoundedVec
}

// TODO: define input
export const proveAuthentication = async (options: PublicKeyCredentialRequestOptions, credential: Credential) => {
    // the credential returned during WebAuthn authentication must be a public key credential.
    // the credential type will be enforced in the circuit
    if (credential.type != "public-key") {
        throw Error("Registration credential must have type 'public-key'");
    }

    // Format the PublicKeyCredentialRequestOptions as an input to the authentication circuit
    const challengeInput = [...new Uint8Array(
        options.challenge instanceof ArrayBuffer ? options.challenge : options.challenge.buffer
    )]

    // Format the Credential as an input to the authentication circuit
    let pkCredential = credential as PublicKeyCredential;
    let response = pkCredential.response as AuthenticatorAssertionResponse;
    let responseInput = {
        authenticator_data: toBoundedVec("authenticatorData", response.authenticatorData, AUTHENTICATOR_DATA_MAX_LEN),
        client_data_json: toBoundedVec("clientDataJson", response.clientDataJSON, CLIENT_DATA_JSON_MAX_LEN),
        signature: toBoundedVec("signature", response.signature, SIGNATURE_MAX_LEN),
        user_handle: toBoundedVec("userHandle", response.userHandle, ID_MAX_LEN)
    };
    let credentialInput = {
        id: toBoundedVec("id", new TextEncoder().encode(pkCredential.id), ID_MAX_LEN),
        raw_id: toBoundedVec("rawId", pkCredential.rawId, ID_MAX_LEN),
        response: responseInput,
        credential_type: credential.type
    };

    // Prepare the authentication circuit input
    const circuitInput: AuthenticationInput = {
        challenge: challengeInput,
        credential: credentialInput
    };

    // Executing
    console.log('Generating witness... ⌛');
    const { witness } = await authentication.execute(circuitInput);
    console.log(witness);

    // Proving
    console.log('Proving... ⌛');
    const proof = await backend.generateProof(witness);
    console.log(proof.proof);

    return proof;
}