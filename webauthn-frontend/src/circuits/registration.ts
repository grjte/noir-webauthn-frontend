import { BarretenbergBackend, CompiledCircuit } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import registrationCircuit from "../../../noir_webauthn_registration/target/noir_webauthn_registration.json";
import { BoundedVec, toBoundedVec, CLIENT_DATA_JSON_MAX_LEN, ATTESTATION_OBJECT_MAX_LEN, ID_MAX_LEN } from './utils';

// Circuit tools setup
// Preloaded so the server starts downloading early and minimize latency.
const backend = new BarretenbergBackend(registrationCircuit as CompiledCircuit, { threads: 4 });
const registration = new Noir(registrationCircuit as CompiledCircuit);
registration.execute({}).catch((_) => {
    import("@aztec/bb.js");
});

type RegistrationInput = {
    challenge: number[]
    credential: RegistrationCredentialInput
}

type RegistrationCredentialInput = {
    id: BoundedVec,
    raw_id: BoundedVec,
    response: AuthenticatorAttestationResponseInput,
    credential_type: string
}

type AuthenticatorAttestationResponseInput = {
    client_data_json: BoundedVec,
    attestation_object: BoundedVec,
}

export const proveRegistration = async (options: PublicKeyCredentialCreationOptions, credential: Credential) => {
    // the credential returned during WebAuthn registration must be a public key credential.
    // the credential type will be enforced in the circuit
    if (credential.type != "public-key") {
        throw Error("Registration credential must have type 'public-key'");
    }

    // Format the PublicKeyCredentialCreationOptions as an input to the registration circuit
    const challengeInput = [...new Uint8Array(
        options.challenge instanceof ArrayBuffer ? options.challenge : options.challenge.buffer
    )]

    // Format the Credential as an input to the registration circuit
    let pkCredential = credential as PublicKeyCredential;
    let response = pkCredential.response as AuthenticatorAttestationResponse;
    let responseInput = {
        client_data_json: toBoundedVec("clientDataJson", response.clientDataJSON, CLIENT_DATA_JSON_MAX_LEN),
        attestation_object: toBoundedVec("attestationObject", response.attestationObject, ATTESTATION_OBJECT_MAX_LEN),
    };
    let credentialInput = {
        id: toBoundedVec("id", new TextEncoder().encode(pkCredential.id), ID_MAX_LEN),
        raw_id: toBoundedVec("rawId", pkCredential.rawId, ID_MAX_LEN),
        response: responseInput,
        credential_type: pkCredential.type
    }

    // Prepare the registration circuit input
    const circuitInput: RegistrationInput = {
        challenge: challengeInput,
        credential: credentialInput
    };

    // Executing
    console.log('Generating witness... ⌛');
    const { witness } = await registration.execute(circuitInput);
    console.log(witness);

    // Proving
    console.log('Proving... ⌛');
    const proof = await backend.generateProof(witness);
    console.log(proof.proof);

    return proof;
}