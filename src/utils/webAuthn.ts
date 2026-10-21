/**
 * WebAuthn (생체인식 / 지문인증) 헬퍼
 * 스마트폰의 지문 센서, Face ID, Windows Hello 등을 활용하여
 * 비밀번호 입력 없이 원터치로 잠금을 해제합니다.
 */

const CREDENTIAL_STORAGE_KEY = 'pwa_biometric_cred_id'

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.isSecureContext) return false
  if (!window.PublicKeyCredential) return false

  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    }
    return false
  } catch {
    return false
  }
}

export function hasRegisteredBiometrics(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(CREDENTIAL_STORAGE_KEY)
}

export function clearRegisteredBiometrics(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CREDENTIAL_STORAGE_KEY)
}

export async function registerBiometrics(username: string): Promise<{ success: boolean; error?: string }> {
  try {
    const available = await isBiometricAvailable()
    if (!available) {
      return { success: false, error: '이 기기에서는 지문/생체 인식을 지원하지 않습니다.' }
    }

    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    const userId = new Uint8Array(16)
    crypto.getRandomValues(userId)

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: '스마트가계부',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null

    if (!credential) {
      return { success: false, error: '지문 등록이 취소되었습니다.' }
    }

    const credIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, credIdBase64)

    return { success: true }
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: '지문 인증이 취소되었거나 거부되었습니다.' }
    }
    return { success: false, error: err.message || '지문 등록에 실패했습니다.' }
  }
}

export async function authenticateWithBiometrics(): Promise<{ success: boolean; error?: string }> {
  try {
    const savedCredId = localStorage.getItem(CREDENTIAL_STORAGE_KEY)
    if (!savedCredId) {
      return { success: false, error: '등록된 지문 정보가 없습니다. 먼저 지문을 등록해 주세요.' }
    }

    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    const rawId = Uint8Array.from(atob(savedCredId), (c) => c.charCodeAt(0))

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: rawId,
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })

    if (!assertion) {
      return { success: false, error: '지문 인증이 완료되지 않았습니다.' }
    }

    return { success: true }
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: '지문 인증이 취소되었습니다.' }
    }
    return { success: false, error: err.message || '지문 인증에 실패했습니다.' }
  }
}
