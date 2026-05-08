package auth

import (
	"crypto/sha256"
	"encoding/base64"
	"strings"
)

// codeVerifierToChallenge 将 PKCE code_verifier 转为 S256 code_challenge
func codeVerifierToChallenge(verifier string) string {
	h := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

// normalizeEmail 标准化 email（小写、去空格）
func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}
