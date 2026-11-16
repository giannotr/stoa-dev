use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ed25519_dalek::{
    Signature,
    Signer,
    SigningKey,
    // VerifyingKey,
};
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};

const SPKI_PREFIX: [u8; 12] = [
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
];

pub fn generate_device_key() -> SigningKey {
    SigningKey::generate(&mut OsRng)
}

pub fn public_key_spki(signing_key: &SigningKey) -> String {
    let verifying_key = signing_key.verifying_key();

    let mut der = Vec::with_capacity(44);
    der.extend_from_slice(&SPKI_PREFIX);
    der.extend_from_slice(verifying_key.as_bytes());

    URL_SAFE_NO_PAD.encode(der)
}

pub fn sign_device_proof(
    signing_key: &SigningKey,
    action: &str,
    challenge_id: &str,
    nonce: &str,
    subject: &str,
) -> String {
    let public_key = public_key_spki(signing_key);

    let message = [
        "invoicer-device-proof-v1",
        action,
        challenge_id,
        nonce,
        &public_key,
        subject,
        "",
    ]
    .join("\n");

    let signature: Signature = signing_key.sign(message.as_bytes());

    URL_SAFE_NO_PAD.encode(signature.to_bytes())
}

pub fn hash_activation_code(code: &str) -> String {
    let normalized: String = code
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '-')
        .flat_map(char::to_uppercase)
        .collect();

    let digest = Sha256::digest(normalized.as_bytes());

    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::Verifier;

    #[test]
    fn device_public_key_has_correct_spki_format() {
        let key = generate_device_key();
        let encoded = public_key_spki(&key);

        let decoded = URL_SAFE_NO_PAD.decode(&encoded).expect("Valid Base64url");

        assert_eq!(decoded.len(), 44);
        assert_eq!(&decoded[..12], &SPKI_PREFIX);
        assert_eq!(&decoded[12..], key.verifying_key().as_bytes());
    }

    #[test]
    fn device_proof_signature_is_valid() {
        let key = generate_device_key();

        let action = "activate";
        let challenge_id = "11111111-1111-4111-8111-111111111111";
        let nonce = "test-nonce";
        let subject = hash_activation_code("ABCD-EFGH-IJKL-MNOP");

        let signature = sign_device_proof(&key, action, challenge_id, nonce, &subject);

        let signature_bytes = URL_SAFE_NO_PAD.decode(signature).unwrap();

        let signature = Signature::from_slice(&signature_bytes).unwrap();

        let message = [
            "invoicer-device-proof-v1",
            action,
            challenge_id,
            nonce,
            &public_key_spki(&key),
            &subject,
            "",
        ]
        .join("\n");

        key.verifying_key()
            .verify(message.as_bytes(), &signature)
            .expect("Signature must be valid");
    }

    #[test]
    fn device_proof_rejects_modified_message() {
        let key = generate_device_key();

        let signature = sign_device_proof(&key, "refresh", "challenge-1", "nonce-1", "device-1");

        let signature_bytes = URL_SAFE_NO_PAD.decode(signature).unwrap();

        let signature = Signature::from_slice(&signature_bytes).unwrap();

        let modified_message = [
            "invoicer-device-proof-v1",
            "refresh",
            "challenge-1",
            "nonce-1",
            &public_key_spki(&key),
            "device-2",
            "",
        ]
        .join("\n");

        assert!(key
            .verifying_key()
            .verify(modified_message.as_bytes(), &signature)
            .is_err());
    }
}
