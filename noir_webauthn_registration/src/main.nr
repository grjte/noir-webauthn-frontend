use noir_webauthn::{RegistrationCredential, verify_registration_response};

global CHALLENGE_LEN = 32;

fn main(
    // TODO replace challenge with options
    // options: PublicKeyCredentialCreationOptions,
    challenge: [u8; CHALLENGE_LEN],
    credential: RegistrationCredential,
) {
    // TODO: check on the necessity of origin and rp_id checks
    // origin is hard-coded for this web application
    let origin = "https://localhost".as_bytes();

    // rp_id is hard-coded for this web application
    let rp_id = "localhost".as_bytes();

    verify_registration_response(credential, challenge, rp_id, origin);
}
