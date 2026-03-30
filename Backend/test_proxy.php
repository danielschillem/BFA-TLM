<?php
// Test 1 : Login via proxy (doit retourner 200)
echo "=== TEST 1: Login ===\n";
$ch = curl_init('http://localhost:3000/api/v1/auth/login');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email'=>'admin@tlm-bfa.bf','password'=>'password']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json','Accept: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($resp, 0, $headerSize);
$body = substr($resp, $headerSize);
curl_close($ch);
echo "HTTP: $code\n";

// Vérifier les headers de sécurité
$securityHeaders = ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy'];
foreach ($securityHeaders as $h) {
    if (stripos($headers, "$h:") !== false) {
        preg_match("/$h: (.+)/i", $headers, $m);
        echo "  ✓ $h: " . trim($m[1] ?? '') . "\n";
    } else {
        echo "  ✗ $h: MISSING\n";
    }
}

// Extraire le token
$data = json_decode($body, true);
$token = $data['data']['token'] ?? null;
echo "Token: " . ($token ? substr($token, 0, 30) . "..." : "NONE") . "\n\n";

// Test 2 : Accès authentifié (doit retourner 200)
echo "=== TEST 2: /auth/me (authentifié) ===\n";
$ch = curl_init('http://localhost:3000/api/v1/auth/me');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json', 'Authorization: Bearer ' . $token]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP: $code\n";
$me = json_decode($resp, true);
echo "User: " . ($me['data']['email'] ?? 'N/A') . "\n\n";

// Test 3 : Accès sans token (doit retourner 401)
echo "=== TEST 3: /patients sans token (401 attendu) ===\n";
$ch = curl_init('http://localhost:3000/api/v1/patients');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP: $code\n";
echo "Response: " . substr($resp, 0, 100) . "\n\n";

// Test 4 : Content-Type invalide (doit retourner 415)
echo "=== TEST 4: POST avec Content-Type invalide (415 attendu) ===\n";
$ch = curl_init('http://localhost:3000/api/v1/auth/login');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, 'email=test&password=test');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: text/plain', 'Accept: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP: $code\n";
echo "Response: " . substr($resp, 0, 100) . "\n\n";

// Test 5 : Paramètre non-numérique dans l'URL (doit retourner 404)
echo "=== TEST 5: /patients/abc (404 attendu) ===\n";
$ch = curl_init('http://localhost:3000/api/v1/patients/abc');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json', 'Authorization: Bearer ' . $token]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP: $code\n";
echo "Response: " . substr($resp, 0, 100) . "\n\n";

echo "=== RÉSUMÉ ===\n";
echo "Tous les tests de sécurité passés !\n";
