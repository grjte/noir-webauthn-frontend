import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { proveRegistration } from '@/circuits/registration';
import { proveAuthentication } from './circuits/authentication';

// WebAuthn helper functions
const bufferToBase64 = (buffer: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const base64ToBuffer = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Helper to format array buffer to byte array
const bufferToByteArray = (buffer: ArrayBuffer): number[] => {
  return Array.from(new Uint8Array(buffer));
};

// Helper to format credential data for logging
const formatCredentialData = (credential: PublicKeyCredential, showRawBytes = false) => {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: showRawBytes
      ? bufferToByteArray(credential.rawId)
      : bufferToBase64(credential.rawId),
    response: {
      attestationObject: response.attestationObject
        ? (showRawBytes
          ? bufferToByteArray(response.attestationObject)
          : bufferToBase64(response.attestationObject))
        : undefined,
      clientDataJSON: showRawBytes
        ? bufferToByteArray(response.clientDataJSON)
        : bufferToBase64(response.clientDataJSON),
    },
    type: credential.type
  };
};

// Helper to format assertion data for logging
const formatAssertionData = (assertion: PublicKeyCredential, showRawBytes = false) => {
  const response = assertion.response as AuthenticatorAssertionResponse;
  return {
    id: assertion.id,
    rawId: showRawBytes
      ? bufferToByteArray(assertion.rawId)
      : bufferToBase64(assertion.rawId),
    response: {
      authenticatorData: showRawBytes
        ? bufferToByteArray(response.authenticatorData)
        : bufferToBase64(response.authenticatorData),
      clientDataJSON: showRawBytes
        ? bufferToByteArray(response.clientDataJSON)
        : bufferToBase64(response.clientDataJSON),
      signature: showRawBytes
        ? bufferToByteArray(response.signature)
        : bufferToBase64(response.signature),
      userHandle: response.userHandle
        ? (showRawBytes
          ? bufferToByteArray(response.userHandle)
          : bufferToBase64(response.userHandle))
        : null
    },
    type: assertion.type
  };
};

export default function WebAuthnDemo() {
  const [username, setUsername] = useState('');
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [showRawBytes, setShowRawBytes] = useState(false);
  const [settings, setSettings] = useState({
    userVerification: 'preferred',
    attachment: 'all-supported',
    attestation: 'none',
    discoverable: 'preferred',
    algorithms: {
      es256: true,
      rs256: true,
    },
    hints: {
      securityKey: false,
      clientDevice: false,
      hybrid: false,
    }
  });

  const handleRegister = async () => {
    try {
      // Generate random challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'WebAuthn Demo',
          id: window.location.hostname
        },
        user: {
          id: Uint8Array.from(username, c => c.charCodeAt(0)),
          name: username,
          displayName: username
        },
        pubKeyCredParams: [
          ...(settings.algorithms.es256 ? [{ alg: -7, type: 'public-key' as const }] : []),
          ...(settings.algorithms.rs256 ? [{ alg: -257, type: 'public-key' as const }] : [])
        ],
        authenticatorSelection: {
          userVerification: settings.userVerification as UserVerificationRequirement,
          authenticatorAttachment: settings.attachment === 'all-supported'
            ? undefined
            : settings.attachment as AuthenticatorAttachment,
          residentKey: "preferred",
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: settings.attestation as AttestationConveyancePreference,
      };

      // Log registration options
      console.group('REGISTRATION OPTIONS');
      console.log(JSON.stringify(publicKeyCredentialCreationOptions, (_, value) => {
        if (value instanceof Uint8Array) {
          return showRawBytes ? Array.from(value) : bufferToBase64(value.buffer);
        }
        return value;
      }, 2));
      console.groupEnd();

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });

      if (credential) {
        // log the registration response
        console.group('REGISTRATION RESPONSE');
        console.log(JSON.stringify(
          formatCredentialData(credential as PublicKeyCredential, showRawBytes),
          null,
          2
        ));
        console.groupEnd();
        // Here you would typically send the credential to your server
        await proveRegistration(publicKeyCredentialCreationOptions, credential);
        // console.group('PROOF');
        // console.log(proof);
        // console.groupEnd();
      }
    } catch (err) {
      console.error('Error during registration:', err);
    }
  };

  const handleAuthenticate = async () => {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: settings.userVerification as UserVerificationRequirement,
        rpId: window.location.hostname,
        allowCredentials: [], // empty array to allow discoverable credentials
      };

      // Add mediation hint to allow automatic credential selection
      const credentialRequestOptions: CredentialRequestOptions = {
        mediation: 'optional', // This allows the browser to show the passkey selection UI
        publicKey: publicKeyCredentialRequestOptions,
      };

      // Log authentication options
      console.group('AUTHENTICATION OPTIONS');
      console.log(JSON.stringify(publicKeyCredentialRequestOptions, (_, value) => {
        if (value instanceof Uint8Array) {
          return showRawBytes ? Array.from(value) : bufferToBase64(value.buffer);
        }
        return value;
      }, 2));
      console.groupEnd();

      const assertion = await navigator.credentials.get(credentialRequestOptions);

      if (assertion) {
        // Log authentication response
        console.group('AUTHENTICATION RESPONSE');
        console.log(JSON.stringify(
          formatAssertionData(assertion as PublicKeyCredential, showRawBytes),
          null,
          2
        ));
        console.groupEnd();
        // Here you would typically send the credential to your server
        await proveAuthentication(publicKeyCredentialRequestOptions, assertion);
        // console.group('PROOF');
        // console.log(proof);
        // console.groupEnd();
      }
    } catch (err) {
      console.error('Error during authentication:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-4xl text-center mb-2">WebAuthn Demo</CardTitle>
          <p className="text-center text-gray-600">A demo of the WebAuthn specification</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="example_username"
              value={username}
              onChange={(e: any) => setUsername(e.target.value)}
            />

            <div className="flex gap-4">
              <Button
                className="flex-1"
                onClick={handleRegister}
              >
                Register
              </Button>
              <Button
                className="flex-1"
                onClick={handleAuthenticate}
              >
                Authenticate
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
              className="w-full"
            >
              Advanced Settings
            </Button>

            {advancedSettingsOpen && (
              <div className="space-y-4">
                <h3 className="font-semibold">Registration Settings</h3>

                <div className="space-y-2">
                  <Label>User Verification</Label>
                  <Select
                    value={settings.userVerification}
                    onValueChange={(value: any) =>
                      setSettings({ ...settings, userVerification: value })}
                  >
                    <option value="preferred">Preferred</option>
                    <option value="required">Required</option>
                    <option value="discouraged">Discouraged</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Attachment</Label>
                  <Select
                    value={settings.attachment}
                    onValueChange={(value: any) =>
                      setSettings({ ...settings, attachment: value })}
                  >
                    <option value="all-supported">All Supported</option>
                    <option value="platform">Platform</option>
                    <option value="cross-platform">Cross Platform</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Public Key Algorithms</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={settings.algorithms.es256}
                        onCheckedChange={(checked: any) =>
                          setSettings({
                            ...settings,
                            algorithms: { ...settings.algorithms, es256: !!checked }
                          })}
                      />
                      <Label>Support ES256</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={settings.algorithms.rs256}
                        onCheckedChange={(checked: any) =>
                          setSettings({
                            ...settings,
                            algorithms: { ...settings.algorithms, rs256: !!checked }
                          })}
                      />
                      <Label>Support RS256</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={showRawBytes}
                    onCheckedChange={(checked) => setShowRawBytes(!!checked)}
                  />
                  <Label>Show Raw Byte Arrays</Label>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setSettings({
                      userVerification: 'preferred',
                      attachment: 'all-supported',
                      attestation: 'none',
                      discoverable: 'preferred',
                      algorithms: { es256: true, rs256: true },
                      hints: { securityKey: false, clientDevice: false, hybrid: false }
                    });
                    setShowRawBytes(false);
                  }}
                >
                  Reset Settings
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div >
  );
}