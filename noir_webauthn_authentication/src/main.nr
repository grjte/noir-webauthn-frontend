use noir_webauthn::{AuthenticationCredential, verify_authentication_response};

global CHALLENGE_LEN = 32;

fn main(
    // TODO replace challenge with options
    // options: PublicKeyCredentialRequestOptions,
    challenge: [u8; CHALLENGE_LEN],
    // credential_current_sign_count: u64,
    // require_user_verification: bool,
    credential: AuthenticationCredential,
) {
    // TODO: check on the necessity of origin and rp_id checks
    // origin is hard-coded for this web application
    let origin = "https://localhost".as_bytes();

    // rp_id is hard-coded for this web application
    let rp_id = "localhost".as_bytes();

    verify_authentication_response(
        credential,
        challenge,
        rp_id,
        origin,
        // credential_current_sign_count,
        // require_user_verification,
    );
}
